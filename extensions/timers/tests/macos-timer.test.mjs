import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const module = { exports: {} };
const source = ts.transpileModule(readFileSync(resolve("src/backend/macosTimer.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
vm.runInNewContext(source, { module, exports: module.exports });
const { buildMacTimerCommand } = module.exports;

// Git Bash allows the same shell argument checks on Windows without macOS speech APIs.
const shell =
  process.platform === "win32" ? join(process.env.ProgramFiles ?? "C:/Program Files", "Git/bin/bash.exe") : "/bin/sh";

test("timer names and paths reach macOS commands as literal arguments", { skip: !existsSync(shell) }, () => {
  const directory = mkdtempSync(join(tmpdir(), "timer's shell test-"));
  const file = join(directory, "speech.timer");
  try {
    writeFileSync(file, "timer");
    const shellPath =
      process.platform === "win32"
        ? execFileSync(shell, ["-c", 'cygpath -u "$1"', "--", file], { encoding: "utf8" }).trim()
        : file;
    const name = 'Tea & Cake\'s "$(printf INJECTED)" `printf BAD` \\ чай\nnext line';
    const command = buildMacTimerCommand({
      timerFile: shellPath,
      timerName: name,
      seconds: 0,
      soundPath: "/unused.wav",
      speak: true,
      volume: 0,
      ringContinuously: false,
    });
    const output = execFileSync(shell, ["-s"], {
      encoding: "utf8",
      input: `osascript() { printf 'toast\\0'; printf '%s\\0' "$@"; }; say() { printf 'speech\\0'; printf '%s\\0' "$@"; }; ${command}\n`,
    }).split("\0");
    assert.deepEqual(output, [
      "toast",
      "-e",
      `display notification ${JSON.stringify(`Timer "${name}" complete`)} with title "Ding!"`,
      "speech",
      "--",
      name,
      "",
    ]);
    assert.equal(existsSync(file), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
