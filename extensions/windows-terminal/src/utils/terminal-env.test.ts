import assert from "node:assert/strict";
import fs from "node:fs";
import { it } from "node:test";
import { getWindowsTerminalEnv } from "./terminal-env.ts";

// Raycast Worker Env
it("restores ProgramFiles that Raycast's worker env drops", (t) => {
  t.mock.method(fs, "existsSync", () => true);
  const env = getWindowsTerminalEnv({ PATH: "C:\\Tools", HOME: "C:\\Users\\me" });

  assert.equal(env.ProgramFiles, "C:\\Program Files");
  assert.equal(env["ProgramFiles(x86)"], "C:\\Program Files (x86)");
  assert.equal(env["ProgramFiles(Arm)"], "C:\\Program Files (Arm)");
  assert.match(env.PATH ?? "", /System32\\OpenSSH/);
});

// Existing Values
it("keeps ProgramFiles values that are already set", () => {
  const env = getWindowsTerminalEnv({ PATH: "", PROGRAMFILES: "D:\\Apps" });

  assert.equal(env.PROGRAMFILES, "D:\\Apps");
  assert.equal(env.ProgramFiles, undefined);
});
