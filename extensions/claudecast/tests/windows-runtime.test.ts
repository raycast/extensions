import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWindowsTerminalArgs,
  encodePowerShellCommand,
  findWindowsExecutable,
  getWindowsPath,
} from "../src/lib/windows-runtime.ts";

test("builds Windows Terminal arguments without interpolating cwd", () => {
  const cwd = "C:\\Users\\Me\\100% Client & Sons";
  const args = buildWindowsTerminalArgs(
    cwd,
    "encoded-command",
    "C:\\Windows\\powershell.exe",
    "tab",
  );
  assert.deepEqual(args, [
    "-w",
    "0",
    "new-tab",
    "--startingDirectory",
    cwd,
    "C:\\Windows\\powershell.exe",
    "-NoLogo",
    "-NoProfile",
    "-NoExit",
    "-EncodedCommand",
    "encoded-command",
  ]);
});

test("PowerShell launch data survives quotes, percent signs, and Unicode", () => {
  const cwd = "C:\\Users\\Me\\100% Client's Repo 你好";
  const command = "& 'claude.exe' 'fix $(whoami); then test'";
  const encoded = encodePowerShellCommand(
    command,
    cwd,
    "C:\\Windows\\System32;C:\\Users\\Me\\.local\\bin",
  );
  const decoded = Buffer.from(encoded, "base64").toString("utf16le");

  assert.ok(
    decoded.indexOf('$ErrorActionPreference = "Stop"') <
      decoded.indexOf("Set-Location -LiteralPath"),
  );
  assert.match(decoded, /Set-Location -LiteralPath/);
  assert.match(decoded, /100% Client''s Repo 你好/);
  assert.match(decoded, /fix \$\(whoami\); then test/);
});

test("returns null when an executable is absent", () => {
  assert.equal(
    findWindowsExecutable(["definitely-not-a-real-file.exe"], "Z:\\missing"),
    null,
  );
});

test("rebuilds Windows PATH after the process environment changes", async () => {
  const originalUpper = process.env.PATH;
  const originalMixed = process.env.Path;
  try {
    delete process.env.PATH;
    process.env.Path = "C:\\Tools\\First";
    const first = await getWindowsPath();
    process.env.Path = "C:\\Tools\\Second";
    const second = await getWindowsPath();
    assert.match(first, /C:\\Tools\\First/i);
    assert.match(second, /C:\\Tools\\Second/i);
    assert.doesNotMatch(second, /C:\\Tools\\First/i);
  } finally {
    if (originalUpper === undefined) delete process.env.PATH;
    else process.env.PATH = originalUpper;
    if (originalMixed === undefined) delete process.env.Path;
    else process.env.Path = originalMixed;
  }
});
