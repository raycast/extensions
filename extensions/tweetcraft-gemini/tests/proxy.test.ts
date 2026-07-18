import assert from "node:assert/strict";
import test from "node:test";
import { formatProxyRoute, normalizeProxyUrl } from "../src/proxy";

test("proxy diagnostics never expose configured credentials", () => {
  const username = "alice";
  const password = "secret";
  const atSign = "@";
  const normalized = normalizeProxyUrl(`http://${username}:${password}${atSign}127.0.0.1:7897`);

  assert.equal(normalized, `http://${username}:${password}${atSign}127.0.0.1:7897/`);
  assert.equal(formatProxyRoute(normalized), "http://127.0.0.1:7897");
  assert.equal(formatProxyRoute(normalized).includes("alice"), false);
  assert.equal(formatProxyRoute(normalized).includes("secret"), false);
});
