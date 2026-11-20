import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PASS_CLI_VERSION } from "./artifact";
import {
  compareVersions,
  createCliVersionReader,
  isSupportedCliVersion,
  MIN_PASS_CLI_VERSION,
  parseCliVersion,
  readCliVersion,
} from "./cli-version";
import { CommandDescriptor } from "./exec";

const fakeCli = resolve("src/lib/testing/fake-pass-cli.mjs");
const fakeCommand = (mode: string): CommandDescriptor => ({ file: process.execPath, args: [fakeCli, mode] });

test("the version is read from what pass-cli --version prints", async () => {
  assert.equal(await readCliVersion(fakeCommand("version:2.4.2")), "2.4.2");
  assert.equal(parseCliVersion("pass-cli 2.10.0 (0123abc)\n"), "2.10.0");
});

test("a pass-cli that doesn't say its version, fails or hangs has no version", async () => {
  assert.equal(await readCliVersion(fakeCommand("version-silent")), undefined);
  assert.equal(await readCliVersion(fakeCommand("auth-denied")), undefined);
  assert.equal(await readCliVersion({ file: join(tmpdir(), "missing-pass-cli"), args: [] }), undefined);
  assert.equal(await readCliVersion(fakeCommand("version-hang"), { timeout: 200 }), undefined);
});

test("versions compare by number, not as text", () => {
  assert.ok(compareVersions("2.10.0", "2.9.9") > 0);
  assert.ok(compareVersions("2.4.2", "2.5.1") < 0);
  assert.equal(compareVersions("2.5.1", "2.5.1"), 0);
  assert.equal(isSupportedCliVersion("2.5.0"), false);
  assert.equal(isSupportedCliVersion("2.5.1"), true);
  assert.equal(isSupportedCliVersion("3.0.0"), true);
});

test("the pass-cli the extension downloads passes its own version check", () => {
  assert.ok(isSupportedCliVersion(PASS_CLI_VERSION), `${PASS_CLI_VERSION} is older than ${MIN_PASS_CLI_VERSION}`);
});

test(
  "a pass-cli's version is read once, and again once the file has changed",
  { skip: process.platform === "win32" },
  async () => {
    const folder = await mkdtemp(join(tmpdir(), "pass-cli-version-"));
    try {
      const file = join(folder, "pass-cli");
      await writeFile(file, "#!/bin/sh\necho 'pass-cli 2.4.2 (0123abc)'\n");
      await chmod(file, 0o755);
      let reads = 0;
      const versionOf = createCliVersionReader(async (command, options) => {
        reads++;
        return readCliVersion(command, options);
      });

      // Several commands start at once.
      assert.deepEqual(await Promise.all([versionOf(file), versionOf(file)]), ["2.4.2", "2.4.2"]);
      assert.equal(await versionOf(file), "2.4.2");
      assert.equal(reads, 1);

      // Updated in place, e.g. by Homebrew.
      await writeFile(file, "#!/bin/sh\necho 'pass-cli 2.7.1 (4567def)'\n");
      const later = new Date(Date.now() + 5_000);
      await utimes(file, later, later);
      assert.equal(await versionOf(file), "2.7.1");
      assert.equal(reads, 2);
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  },
);
