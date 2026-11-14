import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pinCompanionRelease, prepareCompanionRelease } from "../scripts/companion-release-artifacts";
import { companionReleasePlan } from "../scripts/companion-release-plan";

function fixture(
  t: TestContext,
  changes: {
    version?: string;
    id?: string;
    name?: string;
    background?: string;
    extra?: boolean;
    unsigned?: boolean;
  } = {},
) {
  const root = mkdtempSync(path.join(os.tmpdir(), "ah-release-artifacts-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const manifest = {
    version: "1.0.2",
    name: "Companion",
    browser_specific_settings: { gecko: { id: "app-hopper-firefox@chenghsj" } },
  };
  const plan = companionReleasePlan(manifest.version, "1.0.1", false);
  const write = (file: string, value: string) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), value);
  };
  const original = '{"companion":null}\n';
  write("companion/manifest.json", JSON.stringify(manifest));
  write("assets/companion-integration.json", original);
  write("dist/companion/extension/background.js", "expected background");
  write(plan.source, "reviewer source");
  write(
    "fixture/manifest.json",
    JSON.stringify({
      ...manifest,
      version: changes.version ?? manifest.version,
      name: changes.name ?? manifest.name,
      browser_specific_settings: { gecko: { id: changes.id ?? manifest.browser_specific_settings.gecko.id } },
    }),
  );
  write("fixture/background.js", changes.background ?? "expected background");
  if (!changes.unsigned) write("fixture/META-INF/mozilla.rsa", "signature metadata fixture");
  if (changes.extra) write("fixture/extra.js", "extra file");
  mkdirSync(path.join(root, "dist/companion/signed"), { recursive: true });
  const file = path.join(root, "dist/companion/signed/fixture.xpi");
  execFileSync("/usr/bin/zip", ["-r", file, "."], { cwd: path.join(root, "fixture"), stdio: "pipe" });
  return { root, file, plan, original, pin: path.join(root, "assets/companion-integration.json") };
}

test("CI preparation and manual pinning describe the same signed archive and checksums", (t) => {
  const f = fixture(t);
  prepareCompanionRelease(f.root, f.plan, false);
  assert.equal(readFileSync(f.pin, "utf8"), f.original);
  const artifact = pinCompanionRelease(f.root, f.file, f.plan.url);
  assert.equal(
    readFileSync(f.pin, "utf8"),
    readFileSync(path.join(f.root, "dist/companion/release/companion-integration.json"), "utf8"),
  );
  assert.equal(artifact.sha256, createHash("sha256").update(readFileSync(f.file)).digest("hex"));
  assert.match(
    readFileSync(path.join(f.root, "dist/companion/release/SHA256SUMS"), "utf8"),
    new RegExp(`^${artifact.sha256}  app-hopper-companion-1.0.2.xpi\\n`),
  );
  assert.deepEqual(readFileSync(path.join(f.root, f.plan.signed)), readFileSync(f.file));
});

for (const [reason, changes] of [
  ["wrong identity", { id: "other@example.com" }],
  ["wrong version", { version: "9.0.0" }],
  ["missing signature metadata", { unsigned: true }],
] as const) {
  test(`both release paths reject ${reason} before changing the pin or preparing outputs`, (t) => {
    const f = fixture(t, changes);
    assert.throws(() => prepareCompanionRelease(f.root, f.plan, true));
    assert.throws(() => pinCompanionRelease(f.root, f.file, f.plan.url));
    assert.equal(readFileSync(f.pin, "utf8"), f.original);
    assert.equal(existsSync(path.join(f.root, "dist/companion/release")), false);
  });
}

for (const [reason, changes, error] of [
  ["modified manifest", { name: "Changed" }, /manifest/],
  ["modified background", { background: "Changed" }, /background/],
  ["unexpected files", { extra: true }, /Unexpected/],
] as const) {
  test(`CI rejects ${reason}, while manual pinning preserves its identity-only policy`, (t) => {
    const f = fixture(t, changes);
    assert.throws(() => prepareCompanionRelease(f.root, f.plan, true), error);
    assert.equal(readFileSync(f.pin, "utf8"), f.original);
    assert.equal(existsSync(path.join(f.root, "dist/companion/release")), false);
    assert.equal(pinCompanionRelease(f.root, f.file, f.plan.url).version, "1.0.2");
  });
}

test("missing reviewer source or ambiguous signed packages leave the old pin and outputs intact", (t) => {
  const f = fixture(t);
  rmSync(path.join(f.root, f.plan.source));
  assert.throws(() => prepareCompanionRelease(f.root, f.plan, true), /ENOENT/);
  assert.equal(existsSync(path.join(f.root, "dist/companion/release")), false);
  writeFileSync(path.join(f.root, "dist/companion/signed/second.xpi"), "duplicate");
  assert.throws(() => prepareCompanionRelease(f.root, f.plan, true), /exactly one/);
  assert.equal(readFileSync(f.pin, "utf8"), f.original);
});

test("manual pins reject non-direct HTTPS locations before changing configuration", (t) => {
  const f = fixture(t);
  for (const url of [
    "http://example.com/file.xpi",
    "https://user:secret@example.com/file.xpi",
    "https://example.com/file.xpi#fragment",
    "https://example.com/not-xpi",
  ]) {
    assert.throws(() => pinCompanionRelease(f.root, f.file, url), /direct HTTPS/);
  }
  assert.equal(readFileSync(f.pin, "utf8"), f.original);
});
