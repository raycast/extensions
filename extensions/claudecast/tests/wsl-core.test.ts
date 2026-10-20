import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWslClaudePromptFileArgs,
  buildWslClaudeArgs,
  decodeWslDistributionList,
  isWslWindowsPathInsideRoot,
  parseWslClaudeProbe,
  windowsPathToWslMountPath,
  wslLinuxPathToUnc,
} from "../src/lib/wsl-core.ts";
import { buildWindowsTerminalWslArgs } from "../src/lib/windows-runtime.ts";

test("decodes UTF-16 WSL distributions and excludes system distros", () => {
  const output = new TextEncoder().encode("");
  const utf16 = new Uint8Array(
    Buffer.from(
      "Ubuntu\r\nDocker-Desktop\r\nDebian Dev\r\nUbuntu\r\n",
      "utf16le",
    ),
  );
  assert.deepEqual(decodeWslDistributionList(utf16), ["Debian Dev", "Ubuntu"]);
  assert.deepEqual(decodeWslDistributionList(output), []);
});

test("decodes long Unicode-only UTF-16 distribution names", () => {
  const distribution = "开发环境".repeat(50);
  const utf16 = new Uint8Array(Buffer.from(`${distribution}\r\n`, "utf16le"));
  assert.deepEqual(decodeWslDistributionList(utf16), [distribution]);
});

test("parses a bounded WSL Claude probe", () => {
  const output = new TextEncoder().encode(
    "/home/siraj\0/home/siraj/.config/claude\0/home/siraj/.local/bin/claude\0",
  );
  assert.deepEqual(parseWslClaudeProbe("Ubuntu", output), {
    distribution: "Ubuntu",
    home: "/home/siraj",
    claudeConfigDirectory: "/home/siraj/.config/claude",
    claudeExecutable: "/home/siraj/.local/bin/claude",
  });
  assert.equal(
    parseWslClaudeProbe(
      "Ubuntu",
      new TextEncoder().encode("relative\0/etc/claude\0claude\0"),
    ),
    null,
  );
});

test("maps WSL paths to UNC without losing Unicode or spaces", () => {
  assert.equal(
    wslLinuxPathToUnc("Ubuntu Dev", "/home/开发/My Repo/.claude"),
    "\\\\wsl.localhost\\Ubuntu Dev\\home\\开发\\My Repo\\.claude",
  );
  assert.equal(
    wslLinuxPathToUnc("Ubuntu", "/home/me", "wsl$"),
    "\\\\wsl$\\Ubuntu\\home\\me",
  );
});

test("builds WSL and Windows Terminal argument arrays", () => {
  const wslArgs = buildWslClaudeArgs(
    {
      distribution: "Ubuntu Dev",
      claudeExecutable: "/home/me/.local/bin/claude",
    },
    "/home/me/Repo & Tools",
    ["-r", "session-id", 'prompt with quotes " and $HOME'],
  );
  assert.deepEqual(wslArgs, [
    "--distribution",
    "Ubuntu Dev",
    "--cd",
    "/home/me/Repo & Tools",
    "--exec",
    "/home/me/.local/bin/claude",
    "-r",
    "session-id",
    'prompt with quotes " and $HOME',
  ]);
  assert.deepEqual(buildWindowsTerminalWslArgs(wslArgs, "tab"), [
    "-w",
    "0",
    "new-tab",
    "wsl.exe",
    ...wslArgs,
  ]);
});

test("keeps large prompts out of Windows process arguments", () => {
  const prompt = `review this; ${"x".repeat(100_000)}`;
  const promptPath = windowsPathToWslMountPath(
    "C:\\Users\\Me\\AppData\\Local\\Temp\\prompt.txt",
  );
  const args = buildWslClaudePromptFileArgs(
    {
      distribution: "Ubuntu",
      claudeExecutable: "/home/me/.local/bin/claude",
    },
    "/home/me/project",
    ["--permission-mode", "plan"],
    promptPath,
  );
  assert.equal(
    args.some((argument) => argument.includes(prompt)),
    false,
  );
  assert.ok(args.includes(promptPath));
  assert.equal(args.at(-2), "--permission-mode");
  assert.equal(args.at(-1), "plan");
  assert.equal(
    args.some((argument) => argument === ";"),
    false,
  );
});

test("rejects unsafe WSL names and relative working directories", () => {
  assert.throws(() =>
    buildWslClaudeArgs({ distribution: "../Ubuntu" }, "/home/me", []),
  );
  assert.throws(() =>
    buildWslClaudeArgs({ distribution: "Ubuntu" }, "relative/path", []),
  );
});

test("keeps WSL transcript stores inside the Linux home boundary", () => {
  const home = "\\\\wsl.localhost\\Ubuntu\\home\\me";
  assert.equal(
    isWslWindowsPathInsideRoot(`${home}\\.claude\\projects`, home),
    true,
  );
  assert.equal(
    isWslWindowsPathInsideRoot(
      "\\\\wsl.localhost\\Ubuntu\\etc\\claude\\projects",
      home,
    ),
    false,
  );
});
