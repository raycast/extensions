import { describe, expect, it } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { readTomlConfig } from "@/lib/toml";
import { getMcpServers, setMcpServer } from "@/lib/mcp";
import { validateConfigDoc } from "@/lib/validate";
import { listSkills } from "@/lib/skills";

async function createTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

describe("parse/merge/validate fixtures", () => {
  it("parses TOML fixture and validates servers", async () => {
    const fixturePath = path.resolve("tests/fixtures/config.toml");
    const { doc } = await readTomlConfig(fixturePath);
    const servers = getMcpServers(doc);

    expect(servers.playwright.command).toBe("npx");
    const errors = validateConfigDoc(doc);
    expect(errors.some((error) => error.includes("invalid: Command is required."))).toBe(true);
  });

  it("merges new MCP server into existing doc", async () => {
    const fixturePath = path.resolve("tests/fixtures/config.toml");
    const { doc } = await readTomlConfig(fixturePath);
    const updated = setMcpServer(doc, "added", { command: "node", args: ["server.js"] });
    const servers = getMcpServers(updated);
    expect(servers.added.command).toBe("node");
  });

  it("parses skill frontmatter and heading fallback", async () => {
    const dir = await createTempDir("codex-skills-fixtures-");
    const skillDir = path.join(dir, "alpha");
    const skillDir2 = path.join(dir, "beta");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.mkdir(skillDir2, { recursive: true });

    const frontmatter = await fs.readFile(path.resolve("tests/fixtures/skill.md"), "utf8");
    const noFrontmatter = await fs.readFile(path.resolve("tests/fixtures/skill-no-frontmatter.md"), "utf8");
    await fs.writeFile(path.join(skillDir, "SKILL.md"), frontmatter, "utf8");
    await fs.writeFile(path.join(skillDir2, "SKILL.md"), noFrontmatter, "utf8");

    const skills = await listSkills(dir);
    const alpha = skills.find((skill) => skill.name === "alpha");
    const beta = skills.find((skill) => skill.name === "beta");

    expect(alpha?.metadata?.description).toBe("Skill alpha");
    expect(beta?.description).toBe("Beta");
  });
});
