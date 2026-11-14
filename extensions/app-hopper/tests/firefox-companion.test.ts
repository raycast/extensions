import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import createLoader from "./load-ts.ts";

async function fixture(t: import("node:test").TestContext, id = "app-hopper-firefox@chenghsj", version = "1.0.0") {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ah-xpi-"));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.writeFile(
    path.join(directory, "manifest.json"),
    JSON.stringify({
      manifest_version: 2,
      version,
      browser_specific_settings: { gecko: { id } },
    }),
  );
  execFileSync("/usr/bin/zip", ["-j", path.join(directory, "fixture.xpi"), path.join(directory, "manifest.json")]);
  const bytes = await fs.readFile(path.join(directory, "fixture.xpi"));
  const release = {
    version: "1.0.0",
    xpiUrl: "https://downloads.example.com/companion.xpi",
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
  const integration = createLoader({
    "../helpers/applescript": {
      getRaycastPaths: () => ({ assetsPath: directory }),
      execBinary: async (bin, args) => ({ stdout: execFileSync(bin, args, { encoding: "utf8" }), stderr: "" }),
    },
    "./firefox-integration": {
      FIREFOX_DIRECTORY: directory,
      ZEN_DIRECTORY: path.join(directory, "zen"),
      FIREFOX_ADDON_ID: "app-hopper-firefox@chenghsj",
    },
  })("src/browsers/firefox-companion.ts");
  return { directory, bytes, release, integration };
}

test("companion download follows HTTPS redirects, verifies the package, repairs cache, and reuses verified files", async (t) => {
  const { directory, bytes, release, integration } = await fixture(t);
  let calls = 0;
  const fetcher: typeof fetch = async (url, options) => {
    calls++;
    assert.equal(options?.redirect, "manual");
    return calls === 1
      ? new Response(null, { status: 302, headers: { location: "https://cdn.example.com/file.xpi" } })
      : new Response(bytes);
  };
  const file = await integration.downloadFirefoxCompanion(release, fetcher);
  assert.equal(path.extname(file), ".xpi");
  assert.deepEqual(await fs.readFile(file), bytes);
  assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
  await integration.downloadFirefoxCompanion(release, () => {
    throw new Error("Must use verified cache");
  });
  await fs.writeFile(file, "corrupt cache");
  await integration.downloadFirefoxCompanion(release, async () => new Response(bytes));
  assert.deepEqual(await fs.readFile(file), bytes);
  assert.deepEqual(
    (await fs.readdir(path.dirname(file))).filter((name) => name.endsWith(".tmp")),
    [],
  );
  assert(file.startsWith(directory));
});

test("failed downloads never open or retain a corrupt, mismatched, oversized, or downgraded package", async (t) => {
  const { directory, release, integration } = await fixture(t, "another-addon@example.com");
  const bytes = await fs.readFile(path.join(directory, "fixture.xpi"));
  await assert.rejects(
    integration.downloadFirefoxCompanion(release, async () => new Response(bytes)),
    /identity|version/i,
  );
  await assert.rejects(
    integration.downloadFirefoxCompanion(release, async () => new Response("wrong bytes")),
    /checksum/i,
  );
  await assert.rejects(
    integration.downloadFirefoxCompanion(
      release,
      async () => new Response(null, { status: 302, headers: { location: "http://cdn.example.com/file.xpi" } }),
    ),
    /HTTPS/,
  );
  await assert.rejects(
    integration.downloadFirefoxCompanion(release, async () => new Response(null, { status: 503 })),
    /503/,
  );
  await assert.rejects(
    integration.downloadFirefoxCompanion(
      release,
      async () => new Response("body", { headers: { "content-length": "20000000" } }),
    ),
    /too large/i,
  );
  await assert.rejects(
    integration.downloadFirefoxCompanion(release, async () => {
      throw new Error("Network unavailable");
    }),
    /Network unavailable/,
  );
  const cache = path.join(directory, "companion");
  assert.deepEqual(await fs.readdir(cache), []);
});

test("release config accepts a pinned self-distributed XPI and rejects pages, insecure links, and incomplete metadata", async (t) => {
  const { directory, release, integration } = await fixture(t);
  const config = path.join(directory, "companion-integration.json");
  await fs.writeFile(config, JSON.stringify({ companion: null }));
  assert.equal(await integration.getFirefoxCompanionRelease(), null);
  for (const companion of [
    { ...release, sha256: "bad" },
    { ...release, version: "../bad" },
    { ...release, xpiUrl: "https://example.com/addon/" },
    { ...release, xpiUrl: "http://example.com/a.xpi" },
    { ...release, xpiUrl: "https://user@example.com/a.xpi" },
  ]) {
    await fs.writeFile(config, JSON.stringify({ companion }));
    await assert.rejects(integration.getFirefoxCompanionRelease());
  }
  await fs.writeFile(config, JSON.stringify({ companion: release }));
  assert.deepEqual(await integration.getFirefoxCompanionRelease(), release);
});

test("download limits also apply to chunked bodies and redirect loops, without retaining partial files", async (t) => {
  const { directory, release, integration } = await fixture(t);
  await assert.rejects(
    integration.downloadFirefoxCompanion(release, async () => new Response(new Uint8Array(10 * 1024 * 1024 + 1))),
    /too large/i,
  );
  let calls = 0;
  await assert.rejects(
    integration.downloadFirefoxCompanion(release, async () => {
      calls++;
      return new Response(null, { status: 302, headers: { location: "/loop.xpi" } });
    }),
    /redirect/i,
  );
  assert.equal(calls, 6);
  assert.deepEqual(await fs.readdir(path.join(directory, "companion")), []);
});

test("release preparation refuses an unsigned ZIP and leaves release configuration unchanged", async (t) => {
  const manifest = JSON.parse(await fs.readFile("companion/manifest.json", "utf8"));
  const { directory, bytes } = await fixture(t, undefined, manifest.version);
  const config = await fs.readFile("assets/companion-integration.json");
  assert.throws(
    () =>
      execFileSync(
        process.execPath,
        [
          "--import",
          "tsx",
          "scripts/configure-companion-release.ts",
          "--xpi",
          path.join(directory, "fixture.xpi"),
          "--url",
          "https://example.com/signed.xpi",
        ],
        { stdio: "pipe" },
      ),
    (error) => {
      assert(error && typeof error === "object" && "stderr" in error);
      assert.match(String(error.stderr), /signature files are missing/);
      return true;
    },
  );
  assert.deepEqual(await fs.readFile("assets/companion-integration.json"), config);
  assert(bytes.length > 0);
});

test("companion updates compare all connected profile versions numerically without downgrading", async (t) => {
  const { release, integration } = await fixture(t);
  assert.equal(integration.hasFirefoxCompanionUpdate(["0.9.0", "1.0.0"], release), true);
  assert.equal(integration.hasFirefoxCompanionUpdate(["1.0.0", "2.0.0"], release), false);
  assert.equal(integration.hasFirefoxCompanionUpdate(["1.9.0"], { ...release, version: "1.10.0" }), true);
});

test("Firefox and Zen accept the same signed identity while keeping separate caches", async (t) => {
  const shared = await fixture(t);
  const zenFile = await shared.integration.downloadFirefoxCompanion(
    shared.release,
    async () => new Response(shared.bytes),
    "zen",
  );
  const firefoxFile = await shared.integration.downloadFirefoxCompanion(
    shared.release,
    async () => new Response(shared.bytes),
  );
  assert(zenFile.startsWith(path.join(shared.directory, "zen", "companion")));
  assert.notEqual(zenFile, firefoxFile);
  const legacy = await fixture(t, "app-hopper-zen@chenghsj");
  await assert.rejects(
    legacy.integration.downloadFirefoxCompanion(legacy.release, async () => new Response(legacy.bytes), "zen"),
    /identity/,
  );
});

test("release metadata comes from the canonical config and ignores the old Zen config", async (t) => {
  const { directory, release, integration } = await fixture(t);
  await fs.writeFile(path.join(directory, "companion-integration.json"), JSON.stringify({ companion: release }));
  await fs.writeFile(path.join(directory, "zen-integration.json"), JSON.stringify({ companion: null }));
  assert.deepEqual(await integration.getFirefoxCompanionRelease(), release);
});
