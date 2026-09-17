import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { personalSignature, signPersonalRequest, stableStringify } from "../src/lib/personal.ts";

test("stableStringify sorts keys at every level, like the SDK's JSONstringifyOrder", () => {
  const sdkStyle = (obj: unknown) => {
    const keys: string[] = [];
    const seen: Record<string, null> = {};
    JSON.stringify(obj, (k, v) => {
      if (!(k in seen)) {
        keys.push(k);
        seen[k] = null;
      }
      return v;
    });
    keys.sort();
    return JSON.stringify(obj, keys);
  };
  const obj = { query: "b=2&a=1", content: { zeta: 1, alpha: { y: 2, x: 1 } }, path: "/accounts" };
  assert.equal(stableStringify(obj), sdkStyle(obj));
  assert.equal(stableStringify({ content: null, path: "/accounts", query: "" }), '{"content":null,"path":"/accounts","query":""}');
});

test("personalSignature matches an independent HMAC over the canonical message", () => {
  const expected = createHmac("sha256", encodeURI("k/ey")).update('{"content":null,"path":"/accounts","query":"clientId=C&timestamp=1"}').digest("base64");
  assert.equal(personalSignature("k/ey", "/accounts", "clientId=C&timestamp=1", null), expected);
});

test("signPersonalRequest puts clientId first, timestamp last, and signs exactly what it sends", () => {
  const now = new Date(1_700_000_000_000);
  const { url, headers } = signPersonalRequest({ clientId: "CID", consumerKey: "KEY" }, "https://api.snaptrade.com", "/accounts/abc/activities", { startDate: "2026-01-01", limit: 10, skip: undefined }, undefined, now);
  const u = new URL(url);
  assert.equal(u.pathname, "/accounts/abc/activities");
  assert.equal(u.search, "?clientId=CID&startDate=2026-01-01&limit=10&timestamp=1700000000");
  assert.equal(headers.Signature, personalSignature("KEY", "/accounts/abc/activities", u.search.slice(1), null));
  assert.equal(Object.keys(headers).length, 1, "no Bearer / consumerKey headers");
  assert.equal(url.includes("KEY"), false, "consumer key never appears in the URL");
});

test("POST bodies are part of the signed content", () => {
  const now = new Date(1_700_000_000_000);
  const body = { connectionType: "read", connectionPortalVersion: "v4" };
  const { headers } = signPersonalRequest({ clientId: "CID", consumerKey: "KEY" }, "https://api.snaptrade.com", "/snapTrade/login", {}, body, now);
  assert.equal(headers.Signature, personalSignature("KEY", "/snapTrade/login", "clientId=CID&timestamp=1700000000", body));
});
