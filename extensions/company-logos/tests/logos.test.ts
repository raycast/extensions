import assert from "node:assert/strict";
import { mkdtemp, readdir, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { companies } from "../src/companies";
import { getLogoURL, parseDomain } from "../src/domains";
import { getLogoFile } from "../src/logos";

test("domains normalize URLs and discard paths and private query values", () => {
  assert.equal(
    parseDomain(" HTTPS://Stripe.COM/pay?token=secret#section "),
    "stripe.com",
  );
  assert.equal(parseDomain("figma.com/design/abc"), "figma.com");
  assert.equal(parseDomain("https://www.google.com:443/"), "www.google.com");
  assert.equal(parseDomain("bücher.de"), "xn--bcher-kva.de");
  assert.equal(parseDomain("stripe.com."), "stripe.com");
  assert.equal(
    getLogoURL("stripe.com"),
    "https://www.google.com/s2/favicons?domain=stripe.com&sz=256",
  );
});

test("incomplete searches, credentials, IPs, unsafe paths, and non-web schemes are rejected", () => {
  for (const value of [
    "",
    "stripe",
    "some company",
    "localhost",
    "127.0.0.1",
    "[::1]",
    "https://user:pass@stripe.com",
    "file:///etc/passwd",
    "ftp://stripe.com",
    "../stripe.com",
    "a..com",
    "-bad.com",
    "a.local",
    "a.invalid",
  ]) {
    assert.equal(parseDomain(value), undefined, value);
  }
});

test("catalog domains are valid and unique", () => {
  assert.equal(
    new Set(companies.map((company) => company.domain)).size,
    companies.length,
  );
  for (const company of companies) {
    assert.equal(parseDomain(company.domain), company.domain);
  }
});

test("download failures never poison the cache; cached files work offline", async (context) => {
  const cachePath = await mkdtemp(join(tmpdir(), "company-logos-test-"));
  context.after(() => rm(cachePath, { recursive: true, force: true }));
  const request = context.mock.method(
    globalThis,
    "fetch",
    async () => new Response("missing", { status: 404 }),
  );
  await assert.rejects(getLogoFile({ domain: "stripe.com", cachePath }), {
    message: "Logo unavailable",
    status: 404,
  });
  assert.deepEqual(await readdir(cachePath), []);
  request.mock.mockImplementation(
    async () =>
      new Response("<html>error</html>", {
        headers: { "content-type": "text/html" },
      }),
  );
  await assert.rejects(getLogoFile({ domain: "stripe.com", cachePath }), {
    message: "Logo response is not an image",
  });
  assert.deepEqual(await readdir(cachePath), []);
  const cached = join(cachePath, "stripe.com.png");
  await writeFile(cached, "cached image");
  assert.equal(await getLogoFile({ domain: "stripe.com", cachePath }), cached);
  assert.equal(request.mock.callCount(), 2);
  const expired = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  await utimes(cached, expired, expired);
  await assert.rejects(getLogoFile({ domain: "stripe.com", cachePath }));
  assert.equal(request.mock.callCount(), 3);
  await assert.rejects(getLogoFile({ domain: "../escape", cachePath }), {
    status: 400,
  });
});
