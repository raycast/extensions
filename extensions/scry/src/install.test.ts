import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { Archive, VERSION, archive, install } from "./install";
import { Download } from "./scry";

const dir = mkdtempSync(join(tmpdir(), "scry-raycast-install-"));
const name = "scry-cli-test";
mkdirSync(join(dir, "build", name), { recursive: true });
writeFileSync(join(dir, "build", name, "scry"), `#!/bin/sh\necho scry ${VERSION}\n`, { mode: 0o755 });
execFileSync("tar", ["-cJf", join(dir, "scry.tar.xz"), "-C", join(dir, "build"), name]);
const body = readFileSync(join(dir, "scry.tar.xz"));
const sha256 = createHash("sha256").update(body).digest("hex");

let downloads = 0;
const server = createServer((request, response) => {
  if (request.url !== "/scry.tar.xz") {
    response.writeHead(404).end();
    return;
  }
  downloads++;
  response.setHeader("content-length", body.length);
  response.end(body);
});
let good: Archive;
before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  good = { name, url: `http://127.0.0.1:${port}/scry.tar.xz`, sha256 };
});
after(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

let supports = 0;
function support(): string {
  return join(dir, `support-${supports++}`);
}

test("installs scry, and then uses it without a download", async () => {
  const folder = support();
  const events: Download[] = [];
  const scry = await install(folder, good, (event) => events.push(event));
  assert.equal(execFileSync(scry, { encoding: "utf8" }), `scry ${VERSION}\n`);
  assert.deepEqual(events.at(-1), {
    type: "download",
    label: `scry ${VERSION}`,
    done: body.length,
    total: body.length,
  });
  const count = downloads;
  assert.equal(await install(folder, good, () => {}), scry);
  assert.equal(downloads, count);
});

test("refuses a damaged download, and leaves nothing behind", async () => {
  const folder = support();
  await assert.rejects(
    install(folder, { ...good, sha256: "0".repeat(64) }, () => {}),
    {
      message: "The download of scry is damaged",
    },
  );
  assert.deepEqual(readdirSync(folder), []);
});

test("fails when the server has no scry, and leaves nothing behind", async () => {
  const folder = support();
  await assert.rejects(
    install(folder, { ...good, url: good.url.replace("scry.tar.xz", "missing") }, () => {}),
    {
      message: "Cannot download scry: HTTP 404",
    },
  );
  assert.deepEqual(readdirSync(folder), []);
});

test("shares one download between installs that run at once", async () => {
  const folder = support();
  const count = downloads;
  const [first, second] = await Promise.all([install(folder, good, () => {}), install(folder, good, () => {})]);
  assert.equal(first, second);
  assert.equal(downloads, count + 1);
});

test("removes older versions and old leftovers, but not a download that runs", async () => {
  const folder = support();
  mkdirSync(join(folder, "0.5.0"), { recursive: true });
  writeFileSync(join(folder, "0.5.0", "scry"), "");
  mkdirSync(join(folder, ".download-old"));
  mkdirSync(join(folder, ".download-running"));
  const old = new Date(Date.now() - 2 * 60 * 60 * 1000);
  utimesSync(join(folder, ".download-old"), old, old);
  await install(folder, good, () => {});
  assert.deepEqual(readdirSync(folder).sort(), [".download-running", VERSION]);
});

test("picks the build for the chip, with its pinned checksum", () => {
  assert.ok(archive("arm64").url.endsWith(`/v${VERSION}/scry-cli-aarch64-apple-darwin.tar.xz`));
  assert.ok(archive("x64").url.endsWith(`/v${VERSION}/scry-cli-x86_64-apple-darwin.tar.xz`));
  assert.match(archive("arm64").sha256, /^[0-9a-f]{64}$/);
  assert.notEqual(archive("arm64").sha256, archive("x64").sha256);
  assert.throws(() => archive("ia32"), { message: "scry has no build for ia32" });
});
