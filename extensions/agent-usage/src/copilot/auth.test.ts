import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

function makeFakeShell(outputLines: string[]): { dir: string; shellPath: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "copilot-auth-test-"));
  const isWindows = process.platform === "win32";
  const shellPath = path.join(dir, isWindows ? "fake-shell.cmd" : "fake-shell.sh");
  const scriptBody = isWindows
    ? `@echo off\r\n${outputLines.map((line) => `echo ${line}`).join("\r\n")}\r\n`
    : `#!/bin/sh\n${outputLines.map((line) => `printf '%s\\n' '${line}'`).join("\n")}\n`;
  fs.writeFileSync(shellPath, scriptBody, "utf-8");
  if (!isWindows) fs.chmodSync(shellPath, 0o755);
  return { dir, shellPath };
}

async function withEnv<T>(updates: Record<string, string | undefined>, run: () => Promise<T>): Promise<T> {
  const previous = Object.fromEntries(Object.keys(updates).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  try {
    return await run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("resolveCopilotAuthTokens returns both process environment tokens", async () => {
  const { resolveCopilotAuthTokens } = await import("./auth.ts");

  await withEnv({ GITHUB_TOKEN: " github-token ", GH_TOKEN: "gh-token" }, async () => {
    assert.deepEqual(await resolveCopilotAuthTokens(), {
      githubToken: "github-token",
      ghToken: "gh-token",
    });
  });
});

test("resolveCopilotAuthTokens reads both tokens from noisy shell output", async () => {
  const { resolveCopilotAuthTokens } = await import("./auth.ts");
  const { dir, shellPath } = makeFakeShell([
    "loading shell plugins...",
    "__GITHUB_TOKEN_START__shell-github__GITHUB_TOKEN_END__",
    "__GH_TOKEN_START__shell-gh__GH_TOKEN_END__",
  ]);

  try {
    await withEnv({ GITHUB_TOKEN: undefined, GH_TOKEN: undefined, SHELL: shellPath }, async () => {
      assert.deepEqual(await resolveCopilotAuthTokens(), {
        githubToken: "shell-github",
        ghToken: "shell-gh",
      });
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("resolveCopilotAuthTokens prefers each process token over its shell value", async () => {
  const { resolveCopilotAuthTokens } = await import("./auth.ts");
  const { dir, shellPath } = makeFakeShell([
    "__GITHUB_TOKEN_START__shell-github__GITHUB_TOKEN_END__",
    "__GH_TOKEN_START__shell-gh__GH_TOKEN_END__",
  ]);

  try {
    await withEnv({ GITHUB_TOKEN: "direct-github", GH_TOKEN: undefined, SHELL: shellPath }, async () => {
      assert.deepEqual(await resolveCopilotAuthTokens(), {
        githubToken: "direct-github",
        ghToken: "shell-gh",
      });
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
