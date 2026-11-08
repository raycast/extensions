import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import { CliNotFoundError, findCli, runCliJson } from "../../src/lib/cli";

const dirs: string[] = [];
function fakeCli(script: string): string {
  const dir = mkdtempSync(join(tmpdir(), "codexbar-cli-"));
  dirs.push(dir);
  const path = join(dir, "codexbar");
  writeFileSync(path, `#!/bin/sh\n${script}\n`);
  chmodSync(path, 0o755);
  return path;
}
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

describe("findCli", () => {
  it("returns the first existing candidate", () => {
    const path = fakeCli("exit 0");
    expect(findCli(["/nonexistent/codexbar", path])).toBe(path);
    expect(findCli(["/nonexistent/codexbar"])).toBeUndefined();
  });
});

describe("runCliJson", () => {
  it("parses JSON even when the CLI exits non-zero", async () => {
    const path = fakeCli(`echo '[{"provider":"claude"}]'; echo 'provider failed' >&2; exit 1`);
    await expect(runCliJson(["usage"], 5000, path)).resolves.toEqual([{ provider: "claude" }]);
  });

  it("passes arguments without a shell", async () => {
    const path = fakeCli(`printf '["%s","%s"]' "$1" "$2"`);
    await expect(runCliJson(["cost", "it's; rm -rf /"], 5000, path)).resolves.toEqual(["cost", "it's; rm -rf /"]);
  });

  it("surfaces the last stderr line when there is no JSON", async () => {
    const path = fakeCli(`echo 'warming up' >&2; echo 'Not logged in' >&2; exit 1`);
    await expect(runCliJson(["usage"], 5000, path)).rejects.toThrow("Not logged in");
  });

  it("reports timeouts", async () => {
    const path = fakeCli("sleep 5");
    await expect(runCliJson(["usage"], 200, path)).rejects.toThrow(/timed out/);
  });

  it("fails with a typed error when CodexBar is missing", async () => {
    await expect(runCliJson(["usage"], 1000, null)).rejects.toBeInstanceOf(CliNotFoundError);
  });
});
