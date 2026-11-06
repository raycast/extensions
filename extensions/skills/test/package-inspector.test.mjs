import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { inspectLocalPackage } from "../src/utils/package-inspector.ts";

async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), "raycast-agent-package-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function skill(root, name, frontmatter) {
  const directory = join(root, "skills", name);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "SKILL.md"), `---\n${frontmatter}\n---\n\nInstructions.\n`);
}

test("inspects an Agent Skill with spec metadata and bundled resources", async () => {
  await fixture(async (root) => {
    const directory = join(root, "pdf-reader");
    await mkdir(join(directory, "references"), { recursive: true });
    await writeFile(
      join(directory, "SKILL.md"),
      "---\nname: pdf-reader\ndescription: Read PDF files when requested.\nlicense: MIT\ncompatibility: Requires a PDF reader\nmetadata:\n  author: example\nallowed-tools: Read\n---\n\nRead the document.\n",
    );
    await writeFile(join(directory, "references", "guide.md"), "Guide");

    const result = await inspectLocalPackage(directory);
    assert.equal(result.kind, "skill");
    assert.equal(result.valid, true);
    assert.equal(result.skills[0].name, "pdf-reader");
    assert.equal(result.skills[0].license, "MIT");
    assert.equal(result.skills[0].compatibility, "Requires a PDF reader");
    assert.equal(result.skills[0].allowedTools, "Read");
    assert.deepEqual(result.skills[0].metadata, { author: "example" });
    assert.deepEqual(result.skills[0].files, ["references/guide.md"]);
  });
});

test("reports Agent Skill naming and metadata violations", async () => {
  await fixture(async (root) => {
    const directory = join(root, "pdf-reader");
    await mkdir(directory);
    await writeFile(
      join(directory, "SKILL.md"),
      "---\nname: PDF--Reader\ndescription: ''\nmetadata:\n  version: 2\nallowed-tools:\n  - Read\n---\n",
    );

    const result = await inspectLocalPackage(directory);
    assert.equal(result.valid, false);
    assert.match(result.issues.map((issue) => issue.message).join("\n"), /name|description|metadata|allowed-tools/);
  });
});

test("bounds resource enumeration for large local packages", async () => {
  await fixture(async (root) => {
    const directory = join(root, "large-skill");
    await mkdir(directory);
    await writeFile(join(directory, "SKILL.md"), "---\nname: large-skill\ndescription: Large resources.\n---\n");
    await Promise.all(Array.from({ length: 505 }, (_, index) => writeFile(join(directory, `file-${index}.txt`), "x")));

    const result = await inspectLocalPackage(directory);
    assert.ok(result.skills[0].files.length <= 500);
    assert.match(result.issues.map((issue) => issue.message).join("\n"), /truncated/i);
  });
});

test("inspects a portable plugin without dropping other valid components", async () => {
  await fixture(async (root) => {
    await writeFile(
      join(root, "plugin.json"),
      JSON.stringify({ $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json", name: "example.plugin" }),
    );
    await skill(root, "summarize", "name: summarize\ndescription: Summarize text when asked.");
    await skill(root, "bad", "name: wrong\ndescription: Wrong directory name.");
    await writeFile(
      join(root, "mcp.json"),
      JSON.stringify({
        $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
        mcpServers: {
          remote: { type: "streamable-http", url: "https://example.com/mcp" },
          unsafe: { type: "stdio", command: "../outside" },
        },
      }),
    );

    const result = await inspectLocalPackage(root);
    assert.equal(result.kind, "agent-plugin");
    assert.deepEqual(
      result.skills.map((item) => item.name),
      ["bad", "summarize"],
    );
    assert.equal(result.skills.find((item) => item.name === "bad")?.valid, false);
    assert.deepEqual(
      result.mcpServers.map((item) => [item.name, item.valid]),
      [
        ["remote", true],
        ["unsafe", false],
      ],
    );
    assert.equal(result.valid, false);
  });
});

test("rejects an invalid portable manifest before discovering components", async () => {
  await fixture(async (root) => {
    await writeFile(join(root, "plugin.json"), JSON.stringify({ name: "example" }));
    await skill(root, "summarize", "name: summarize\ndescription: Summarize text.");

    const result = await inspectLocalPackage(root);
    assert.equal(result.kind, "agent-plugin");
    assert.equal(result.valid, false);
    assert.equal(result.skills.length, 0);
    assert.match(result.issues[0].message, /schema/i);
  });
});

test("never reads a symlink that escapes the plugin root", async () => {
  await fixture(async (root) => {
    const outside = await mkdtemp(join(tmpdir(), "raycast-outside-"));
    try {
      await writeFile(
        join(root, "plugin.json"),
        JSON.stringify({ $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json", name: "safe-plugin" }),
      );
      await mkdir(join(root, "skills"));
      await writeFile(join(outside, "SKILL.md"), "---\nname: escaped\ndescription: Should not be read.\n---\n");
      await symlink(outside, join(root, "skills", "escaped"));

      const result = await inspectLocalPackage(root);
      assert.equal(result.skills.length, 0);
      assert.match(result.issues.map((issue) => issue.message).join("\n"), /outside|escape|root/i);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});

test("recognizes but rejects a plugin manifest symlink outside the root", async () => {
  await fixture(async (root) => {
    const outside = await mkdtemp(join(tmpdir(), "raycast-manifest-outside-"));
    try {
      await writeFile(join(outside, "plugin.json"), JSON.stringify({ name: "outside" }));
      await symlink(join(outside, "plugin.json"), join(root, "plugin.json"));
      const result = await inspectLocalPackage(root);
      assert.equal(result.kind, "agent-plugin");
      assert.equal(result.valid, false);
      assert.deepEqual(result.skills, []);
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});

test("rejects MCP command and cwd paths that escape the plugin root", async () => {
  await fixture(async (root) => {
    const outside = await mkdtemp(join(tmpdir(), "raycast-mcp-outside-"));
    try {
      await writeFile(join(outside, "server"), "outside");
      await mkdir(join(root, "bin"));
      await symlink(join(outside, "server"), join(root, "bin", "server"));
      await writeFile(
        join(root, "plugin.json"),
        JSON.stringify({ $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json", name: "mcp-test" }),
      );
      await writeFile(
        join(root, "mcp.json"),
        JSON.stringify({
          $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
          mcpServers: {
            escapedCommand: { type: "stdio", command: "./bin/server" },
            escapedCwd: { type: "stdio", command: "node", cwd: "./../outside" },
          },
        }),
      );

      const result = await inspectLocalPackage(root);
      assert.deepEqual(
        result.mcpServers.map((server) => server.valid),
        [false, false],
      );
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});

test("accepts permitted plugin names and MCP working directories", async () => {
  await fixture(async (root) => {
    await writeFile(
      join(root, "plugin.json"),
      JSON.stringify({
        $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
        name: "a-.b",
        extra: true,
      }),
    );
    await writeFile(
      join(root, "mcp.json"),
      JSON.stringify({
        $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
        mcpServers: {
          local: { type: "stdio", command: "node", cwd: "${PLUGIN_ROOT}" },
          data: { type: "stdio", command: "node", cwd: "${PLUGIN_DATA}/cache" },
          loopback: { type: "streamable-http", url: "http://127.0.0.2/mcp" },
        },
      }),
    );

    const result = await inspectLocalPackage(root);
    assert.equal(result.valid, true);
    assert.equal(result.issues.length, 1);
    assert.equal(result.issues[0].level, "warning");
    assert.deepEqual(
      result.mcpServers.map((server) => server.valid),
      [true, true, true],
    );
  });
});

test("reports missing package-relative MCP commands and working directories", async () => {
  await fixture(async (root) => {
    await mkdir(join(root, "bin"));
    await mkdir(join(root, "work"));
    await writeFile(join(root, "bin", "server"), "server");
    await writeFile(
      join(root, "plugin.json"),
      JSON.stringify({ $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json", name: "mcp-files" }),
    );
    await writeFile(
      join(root, "mcp.json"),
      JSON.stringify({
        $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
        mcpServers: {
          missingCommand: { type: "stdio", command: "./bin/missing" },
          directoryCommand: { type: "stdio", command: "./bin" },
          missingCwd: { type: "stdio", command: "node", cwd: "${PLUGIN_ROOT}/missing" },
          fileCwd: { type: "stdio", command: "node", cwd: "./bin/server" },
          valid: { type: "stdio", command: "./bin/server", cwd: "./work" },
          generatedData: { type: "stdio", command: "node", cwd: "${PLUGIN_DATA}/future" },
        },
      }),
    );

    const result = await inspectLocalPackage(root);
    assert.deepEqual(
      result.mcpServers.map((server) => [server.name, server.valid]),
      [
        ["missingCommand", false],
        ["directoryCommand", false],
        ["missingCwd", false],
        ["fileCwd", false],
        ["valid", true],
        ["generatedData", true],
      ],
    );
    assert.equal(result.valid, false);
  });
});

test("rejects a dangling plugin manifest symlink", async () => {
  await fixture(async (root) => {
    await symlink("missing.json", join(root, "plugin.json"));
    const result = await inspectLocalPackage(root);
    assert.equal(result.kind, "agent-plugin");
    assert.equal(result.valid, false);
    assert.match(result.issues[0].message, /dangling symlink/);
  });
});

test("rejects remote HTTP disguised as loopback and invalid headers", async () => {
  await fixture(async (root) => {
    await writeFile(
      join(root, "plugin.json"),
      JSON.stringify({ $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json", name: "demo" }),
    );
    await writeFile(
      join(root, "mcp.json"),
      JSON.stringify({
        $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
        mcpServers: {
          remote: { type: "streamable-http", url: "http://127.evil.example/mcp" },
          invalid: { type: "streamable-http", url: "https://example.com/mcp", headers: { "Bad Header": "x" } },
          duplicate: {
            type: "streamable-http",
            url: "https://example.com/mcp",
            headers: { "X-Test": "a", "x-test": "b" },
          },
        },
      }),
    );
    const result = await inspectLocalPackage(root);
    assert.equal(result.valid, false);
    assert.deepEqual(
      result.mcpServers.map((server) => server.valid),
      [false, false, false],
    );
    assert.ok(result.issues.some((issue) => issue.message.includes("Invalid or insecure MCP URL")));
    assert.ok(result.issues.some((issue) => issue.message.includes("Invalid HTTP header field")));
    assert.ok(result.issues.some((issue) => issue.message.includes("Duplicate HTTP header name")));
  });
});

test("rejects reserved MCP environment variables without hiding valid servers", async () => {
  await fixture(async (root) => {
    await writeFile(
      join(root, "plugin.json"),
      JSON.stringify({ $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json", name: "env-test" }),
    );
    await writeFile(
      join(root, "mcp.json"),
      JSON.stringify({
        $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
        mcpServers: {
          bad: { type: "stdio", command: "node", env: { PLUGIN_ROOT: "override" } },
          good: { type: "stdio", command: "node" },
        },
      }),
    );

    const result = await inspectLocalPackage(root);
    assert.deepEqual(
      result.mcpServers.map((server) => server.valid),
      [false, true],
    );
  });
});

test("distinguishes Claude and Codex compatibility layouts from portable plugins", async () => {
  await fixture(async (root) => {
    const claude = join(root, "claude");
    const codex = join(root, "codex");
    await mkdir(join(claude, ".claude-plugin"), { recursive: true });
    await mkdir(join(claude, "hooks"));
    await mkdir(join(codex, ".codex-plugin"), { recursive: true });
    await writeFile(join(claude, ".claude-plugin", "plugin.json"), JSON.stringify({ name: "claude-test" }));
    await writeFile(join(codex, ".codex-plugin", "plugin.json"), JSON.stringify({ name: "codex-test" }));

    const claudeResult = await inspectLocalPackage(claude);
    assert.equal(claudeResult.kind, "claude-plugin");
    assert.ok(claudeResult.entries.includes("hooks/"));
    assert.equal((await inspectLocalPackage(codex)).kind, "codex-plugin");
  });
});
