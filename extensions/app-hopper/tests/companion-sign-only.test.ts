import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

test("sign-only preparation retains the signed artifact without changing the configured download", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "ah-sign-only-"));
  const script = path.resolve("scripts/companion-release.ts");
  const manifest = JSON.parse(readFileSync("companion/manifest.json", "utf8"));
  const version = manifest.version;
  const config = JSON.stringify({
    companion: { version: "1.0.0", xpiUrl: "https://example.com/old.xpi", sha256: "old" },
  });
  try {
    for (const subdir of [
      "companion",
      "assets",
      "dist/companion/extension",
      "dist/companion/signed",
      "fixture/META-INF",
    ]) {
      mkdirSync(path.join(directory, subdir), { recursive: true });
    }
    const write = (file: string, value: string) => writeFileSync(path.join(directory, file), value);
    write("companion/manifest.json", JSON.stringify(manifest));
    write("assets/companion-integration.json", config);
    write("dist/companion/extension/background.js", "fixture background");
    write(`dist/companion/app-hopper-companion-${version}-source.zip`, "fixture source archive");
    write("fixture/manifest.json", JSON.stringify(manifest));
    write("fixture/background.js", "fixture background");
    // Metadata-only fixture: cryptographic verification remains the browser's responsibility.
    write("fixture/META-INF/mozilla.rsa", "test signature metadata");
    execFileSync(
      "/usr/bin/zip",
      ["-r", path.join(directory, "dist/companion/signed/fixture.xpi"), "manifest.json", "background.js", "META-INF"],
      { cwd: path.join(directory, "fixture"), stdio: "pipe" },
    );
    const prepare = (publish: boolean) =>
      execFileSync(process.execPath, ["--import", require.resolve("tsx"), script, "prepare"], {
        cwd: directory,
        env: { ...process.env, DRY_RUN: "false", PUBLISH_RELEASE: String(publish) },
        stdio: "pipe",
      });
    prepare(false);
    assert.equal(readFileSync(path.join(directory, "assets/companion-integration.json"), "utf8"), config);
    assert(existsSync(path.join(directory, `dist/companion/release/app-hopper-companion-${version}.xpi`)));
    prepare(true);
    assert.equal(
      JSON.parse(readFileSync(path.join(directory, "assets/companion-integration.json"), "utf8")).companion.version,
      version,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
