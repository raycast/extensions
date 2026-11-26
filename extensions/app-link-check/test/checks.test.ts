import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAasa, checkAssetLinks, evaluateAasa, evaluateAssetLinks, normalizeDomain, runChecks } from "../src/checks";

const FP = Array(32).fill("AB").join(":");
const stub = (map: (u: string, init?: RequestInit) => Response) => ((u: any, i: any) => Promise.resolve(map(String(u), i))) as typeof fetch;
const ok = (b: unknown) => new Response(JSON.stringify(b), { status: 200 });

test("normalizeDomain accepts hosts and strips scheme/path, rejects junk", () => {
  assert.equal(normalizeDomain(" https://Example.com/path "), "example.com");
  assert.equal(normalizeDomain("localhost"), undefined);
  assert.equal(normalizeDomain("exa mple.com"), undefined);
  assert.equal(normalizeDomain("a.com:8080"), undefined);
});
test("AASA: expected ID present ok, absent fail, none listed warn", () => {
  const d = { applinks: { details: [{ appIDs: ["T.com.x"] }] } };
  assert.equal(evaluateAasa(d, "T.com.x").status, "ok");
  assert.equal(evaluateAasa(d, "T.com.y").status, "fail");
  assert.equal(evaluateAasa({ applinks: { details: [] } }).status, "warn");
  assert.equal(evaluateAasa(d).status, "ok");
});
test("AASA redirect fails, bad JSON fails", async () => {
  assert.equal((await checkAasa(stub(() => new Response("", { status: 301 })), "a.com")).status, "fail");
  assert.equal((await checkAasa(stub(() => new Response("<html>")), "a.com")).status, "fail");
});
test("assetlinks: empty warn, wrong package fail, missing fingerprint fail, good ok, bad fp format warn", () => {
  const st = (pkg: string, fps: string[]) => ({ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: pkg, sha256_cert_fingerprints: fps } });
  assert.equal(evaluateAssetLinks([]).status, "warn");
  assert.equal(evaluateAssetLinks([st("a.b", [FP])], "c.d").status, "fail");
  assert.equal(evaluateAssetLinks([st("a.b", [])], "a.b").status, "fail");
  assert.equal(evaluateAssetLinks([st("a.b", [FP])], "a.b").status, "ok");
  assert.equal(evaluateAssetLinks([st("a.b", ["nope"])], "a.b").status, "warn");
  assert.equal(evaluateAssetLinks({}).status, "fail");
});
test("runChecks returns an iOS and an Android row; network error is a fail row", async () => {
  const rows = await runChecks({ domain: "a.com", f: stub((u) => ok(u.includes("assetlinks") ? [] : { applinks: { details: [] } })) });
  assert.deepEqual(rows.map((r) => r.platform), ["iOS", "Android"]);
  const boom = (() => Promise.reject(new Error("dns"))) as typeof fetch;
  assert.ok((await runChecks({ domain: "a.com", f: boom })).every((r) => r.status === "fail"));
  assert.equal((await checkAssetLinks(stub(() => new Response("", { status: 404 })), "a.com")).status, "fail");
});

test("assetlinks redirect fails, wrong content-type warns", async () => {
  assert.equal((await checkAssetLinks(stub(() => new Response("", { status: 302 })), "a.com")).status, "fail");
  const good = [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: "p.q", sha256_cert_fingerprints: [Array(32).fill("AB").join(":")] } }];
  const r = await checkAssetLinks(stub(() => new Response(JSON.stringify(good), { status: 200, headers: { "content-type": "text/html" } })), "a.com");
  assert.equal(r.status, "warn");
});
