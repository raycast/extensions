import assert from "node:assert/strict";
import test from "node:test";
import { findRunnableCli, getCliCandidates } from "../src/pass/cli-executable";

function executableCheck(expected: string) {
  return async (candidate: string) => {
    if (candidate !== expected) throw Object.assign(new Error("not found"), { code: "ENOENT" });
  };
}

test("finds the official Windows installation in Program Files", async () => {
  const expected = "C:\\Program Files\\ProtonPass\\pass-cli.exe";
  const candidates = getCliCandidates("win32", { ProgramFiles: "C:\\Program Files", PATH: "" }, "C:\\Users\\test");

  assert.equal(await findRunnableCli(candidates, executableCheck(expected)), expected);
});

test("supports environment variable names with different casing", async () => {
  const expected = "D:\\Apps\\ProtonPass\\pass-cli.exe";
  const candidates = getCliCandidates("win32", { PROGRAMFILES: "D:\\Apps", PATH: "" }, "C:\\Users\\test");

  assert.equal(await findRunnableCli(candidates, executableCheck(expected)), expected);
});

test("uses a configured path before automatic candidates", async () => {
  const expected = "D:\\Tools\\pass-cli.exe";
  const candidates = getCliCandidates("win32", { PATH: "" }, "C:\\Users\\test", expected);

  assert.equal(await findRunnableCli(candidates, executableCheck(expected)), expected);
});

test("tries the absolute path after the PATH command fails", async () => {
  const expected = "C:\\Program Files\\ProtonPass\\pass-cli.exe";
  const attempts: string[] = [];
  const candidates = ["pass-cli.exe", expected];

  const result = await findRunnableCli(candidates, async (candidate) => {
    attempts.push(candidate);
    if (candidate !== expected) throw Object.assign(new Error("not found"), { code: "ENOENT" });
  });

  assert.equal(result, expected);
  assert.deepEqual(attempts, ["pass-cli.exe", expected]);
});

test("builds Unix candidates from PATH and standard install locations", () => {
  const candidates = getCliCandidates("linux", { PATH: "/custom/bin:/other/bin" }, "/home/test");
  assert.deepEqual(candidates, [
    "/custom/bin/pass-cli",
    "/other/bin/pass-cli",
    "/home/test/.local/bin/pass-cli",
    "/usr/local/bin/pass-cli",
    "/opt/homebrew/bin/pass-cli",
    "pass-cli",
  ]);
});

test("returns undefined when no candidate is runnable", async () => {
  assert.equal(await findRunnableCli(["missing"], executableCheck("other")), undefined);
});

test("does not hide execution errors unrelated to a missing file", async () => {
  await assert.rejects(
    () =>
      findRunnableCli(["broken"], async () => {
        throw new Error("permission denied");
      }),
    /permission denied/,
  );
});
