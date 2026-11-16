import assert from "node:assert/strict";
import { test } from "node:test";
import { MockAgent } from "undici";
import { createNetworkHost, isPublicAddress, validateRemoteUrl } from "../src/lib/network";

test("rejects special-use IPv4, IPv6, and mapped addresses", () => {
  for (const address of [
    "127.0.0.1",
    "10.1.2.3",
    "172.16.1.1",
    "192.168.1.2",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "fe80::1",
    "fc00::1",
    "::ffff:127.0.0.1",
    "::",
    "garbage",
  ])
    assert.equal(isPublicAddress(address), false, address);
  for (const address of ["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"])
    assert.equal(isPublicAddress(address), true, address);
});

test("only X and its known public media hosts are eligible", () => {
  assert.equal(validateRemoteUrl("https://pbs.twimg.com/media/test.png").hostname, "pbs.twimg.com");
  for (const url of [
    "http://x.com",
    "https://localhost",
    "https://192.168.0.1",
    "https://x.com.evil.test",
    "https://example.com",
    "https://user@x.com",
    "https://x.com:99",
  ])
    assert.throws(() => validateRemoteUrl(url));
});

test("caps downloads, follows no redirects in transport, and honors cancellation", async () => {
  const transport = new MockAgent();
  transport.disableNetConnect();
  const pool = transport.get("https://x.com");
  pool.intercept({ path: "/small" }).reply(200, "hello");
  pool.intercept({ path: "/large" }).reply(200, "a".repeat(1024));
  pool
    .intercept({ path: "/redirect" })
    .reply(302, "", { headers: { location: "http://127.0.0.1/" } })
    .times(6);
  const abort = new AbortController();
  const { host, close } = createNetworkHost(abort.signal, transport);
  try {
    assert.equal(Buffer.from((await host.fetch({ url: "https://x.com/small" })).body).toString(), "hello");
    await assert.rejects(host.fetch({ url: "https://x.com/large", maxBytes: 16 }), /download limit/);
    for (let index = 0; index < 5; index++)
      assert.equal((await host.fetch({ url: "https://x.com/redirect" })).status, 302);
    await assert.rejects(host.fetch({ url: "https://x.com/redirect" }), /redirect limit/);
    abort.abort();
    await assert.rejects(host.fetch({ url: "https://x.com/small" }), /abort/i);
  } finally {
    await close();
  }
});
