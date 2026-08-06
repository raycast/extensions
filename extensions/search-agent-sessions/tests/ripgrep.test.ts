import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { RG_VERSION, assetFor, verifyDigest } from "../src/lib/ripgrep";

test("each supported arch names the release built for it", () => {
  // Handing an Intel Mac the aarch64 build produces a binary that cannot be
  // executed at all, and the failure surfaces as a bare spawn error naming
  // neither the arch nor the download — so the mapping is asserted directly.
  const arm = assetFor("arm64");
  assert.ok(arm);
  assert.match(arm.url, /aarch64-apple-darwin\.tar\.gz$/);
  assert.equal(arm.member, `ripgrep-${RG_VERSION}-aarch64-apple-darwin/rg`);

  const intel = assetFor("x64");
  assert.ok(intel);
  assert.match(intel.url, /x86_64-apple-darwin\.tar\.gz$/);
  assert.equal(intel.member, `ripgrep-${RG_VERSION}-x86_64-apple-darwin/rg`);
});

test("the two arches carry different digests", () => {
  // Copying one arch's block to write the other is the obvious way to author
  // this table, and a duplicated digest would reject the download it guards
  // rather than admit a wrong one — a confusing but safe failure worth
  // catching here instead of on a user's Intel Mac.
  const arm = assetFor("arm64");
  const intel = assetFor("x64");
  assert.ok(arm && intel);
  assert.notEqual(arm.sha256, intel.sha256);
  for (const asset of [arm, intel])
    assert.match(asset.sha256, /^[0-9a-f]{64}$/);
});

test("the pinned version is the one every asset points at", () => {
  // The version appears in the URL, the digest table and the path inside the
  // tarball. A bump that misses one of them downloads one release and looks
  // for a member of another, so they are checked against a single source.
  for (const arch of ["arm64", "x64"] as const) {
    const asset = assetFor(arch);
    assert.ok(asset);
    assert.ok(asset.url.includes(`/${RG_VERSION}/`));
    assert.ok(asset.member.startsWith(`ripgrep-${RG_VERSION}-`));
  }
});

test("an arch with no published build yields nothing rather than a guess", () => {
  // The caller falls back to grep on null. Returning some other arch's asset
  // would instead download a binary that cannot run and report success.
  assert.equal(assetFor("ppc64"), null);
  assert.equal(assetFor("ia32"), null);
});

test("a digest matching the pinned one passes", () => {
  const body = Buffer.from("pretend this is a tarball");
  const digest = createHash("sha256").update(body).digest("hex");
  assert.equal(verifyDigest(body, digest), true);
});

test("a body that does not match its digest is rejected", () => {
  // The whole point of pinning: a substituted or truncated download must not
  // reach `tar`, let alone `chmod +x`.
  const body = Buffer.from("pretend this is a tarball");
  const other = createHash("sha256").update("something else").digest("hex");
  assert.equal(verifyDigest(body, other), false);
  assert.equal(verifyDigest(Buffer.alloc(0), other), false);
});

test("digest comparison ignores the case the hex is written in", () => {
  // The published .sha256 files are lowercase, but a digest pasted from
  // elsewhere may not be, and a case-sensitive compare would reject a
  // perfectly good download.
  const body = Buffer.from("pretend this is a tarball");
  const digest = createHash("sha256").update(body).digest("hex");
  assert.equal(verifyDigest(body, digest.toUpperCase()), true);
});
