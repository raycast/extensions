import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import dns from "node:dns";
import type { LookupAddress } from "node:dns";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

import {
  CoverSecurityError,
  coverDispatcher,
  isPublicCoverAddress,
  lookupCoverAddress,
  validateCoverUrl,
} from "../src/utils/api/cover-security";
import { getCachedBookCover, getCachedFullSizeBookCover } from "../src/utils/api/covers";
import { mirrors } from "../src/utils/api/mirrors";
import { parseContentIntoBooks } from "../src/utils/api/mirrors/default";

let directory: string;
const image = Buffer.from("/9j/2Q==", "base64");
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "libgen-cover-security-"));
});
after(async () => {
  await coverDispatcher.destroy();
  await rm(directory, { recursive: true, force: true });
});

const lookup = (all = true) =>
  new Promise<string | LookupAddress[]>((resolve, reject) => {
    lookupCoverAddress("libgen.li", { all }, (error, address) => (error ? reject(error) : resolve(address)));
  });

test("cover origins allow known HTTPS mirrors and an explicitly configured HTTPS mirror", () => {
  for (const { baseUrl } of mirrors) assert.equal(validateCoverUrl(`${baseUrl}/covers/book.jpg`).origin, baseUrl);
  const preferred = "https://books.example.org";
  assert.equal(validateCoverUrl(`${preferred}/covers/book.jpg`, preferred).origin, preferred);
  assert.throws(() => validateCoverUrl(`${preferred}/covers/book.jpg`), CoverSecurityError);
  assert.throws(() => validateCoverUrl("https://attacker.example/book.jpg", "invalid preference"), CoverSecurityError);
});

test("private, local, disguised, credential-bearing and non-HTTPS cover URLs never reach fetch", async (context) => {
  let requests = 0;
  context.mock.method(globalThis, "fetch", async () => {
    requests++;
    throw new Error("must not fetch an unsafe URL");
  });
  for (const url of [
    "http://libgen.li/covers/book.jpg",
    "file:///etc/passwd",
    "https://localhost/book.jpg",
    "https://127.0.0.1/book.jpg",
    "https://127.1/book.jpg",
    "https://2130706433/book.jpg",
    "https://0x7f000001/book.jpg",
    "https://0177.0.0.1/book.jpg",
    "https://10.0.0.1/book.jpg",
    "https://172.16.0.1/book.jpg",
    "https://192.168.1.1/book.jpg",
    "https://169.254.169.254/book.jpg",
    "https://[::1]/book.jpg",
    "https://[::ffff:127.0.0.1]/book.jpg",
    "https://[fe80::1]/book.jpg",
    "https://libgen.li.attacker.example/book.jpg",
    "https://libgen.li@127.0.0.1/book.jpg",
    "https://user:password@libgen.li/book.jpg",
    "https://libgen.li:8080/book.jpg",
    "https://8.8.8.8/book.jpg",
  ]) {
    await assert.rejects(getCachedBookCover(url, directory), CoverSecurityError, url);
  }
  assert.equal(requests, 0);
});

test("absolute private image URLs from mirror HTML are rejected at the download boundary", async () => {
  const row = `<table id="tablelibgen"><tbody><tr><td><a><img src="https://192.168.1.1/secret.jpg"></a></td>
    <td><a href="edition.php?id=1">Book</a></td><td>Author</td><td>Publisher</td><td>2020</td>
    <td>English</td><td>1</td><td><a>1 MB</a></td><td>epub</td><td><a href="ads.php?md5=abc">Download</a></td>
    </tr></tbody></table>`;
  const [book] = parseContentIntoBooks(row, "https://libgen.li");
  assert.equal(book.coverUrl, "https://192.168.1.1/secret.jpg");
  await assert.rejects(getCachedFullSizeBookCover(book.coverUrl, directory), CoverSecurityError);
});

test("unsafe URLs are rejected before reuse of a cover cached by an older version", async () => {
  const url = "https://127.0.0.1/cached.jpg";
  const cache = join(directory, "covers");
  await mkdir(cache, { recursive: true });
  await writeFile(join(cache, `${createHash("sha256").update(url).digest("hex")}.jpg`), image);
  await assert.rejects(getCachedBookCover(url, directory), CoverSecurityError);
});

test("each unsafe redirect is blocked before the next request and causes no thumbnail fallback", async (context) => {
  const requests: string[] = [];
  let location = "";
  context.mock.method(globalThis, "fetch", async (input: URL, init: RequestInit) => {
    requests.push(input.toString());
    assert.equal(init.redirect, "manual");
    assert.ok(init.dispatcher);
    return new Response(null, { status: 302, headers: { Location: location } });
  });
  const before = await readdir(join(directory, "covers"));
  for (const target of [
    "https://127.0.0.1/private.jpg",
    "https://10.0.0.1/private.jpg",
    "//192.168.0.1/private.jpg",
    "https://[::1]/private.jpg",
    "https://attacker.example/private.jpg",
    "http://libgen.li/cover.jpg",
    "https://libgen.li:8443/cover.jpg",
    "file:///etc/passwd",
  ]) {
    location = target;
    requests.length = 0;
    await assert.rejects(
      getCachedFullSizeBookCover("https://libgen.li/covers/redirect_small.jpg", directory),
      CoverSecurityError,
    );
    assert.deepEqual(requests, ["https://libgen.li/covers/redirect.jpg"]);
    assert.deepEqual(await readdir(join(directory, "covers")), before);
  }
});

test("relative and cross-mirror redirects preserve headers and successfully cache the cover", async (context) => {
  const requests: string[] = [];
  context.mock.method(globalThis, "fetch", async (input: URL, init: RequestInit) => {
    const url = input.toString();
    requests.push(url);
    assert.equal(init.redirect, "manual");
    assert.deepEqual(init.headers, { "User-Agent": "Raycast-Library-Genesis", Referer: `${input.origin}/index.php` });
    if (requests.length === 1)
      return new Response(null, { status: 301, headers: { Location: "/covers/redirected.jpg" } });
    if (requests.length === 2)
      return new Response(null, { status: 307, headers: { Location: "https://libgen.bz/covers/safe.jpg" } });
    return new Response(image, { headers: { "Content-Type": "image/jpeg" } });
  });
  await getCachedBookCover("https://libgen.li/covers/safe-redirect.jpg", directory);
  assert.deepEqual(requests, [
    "https://libgen.li/covers/safe-redirect.jpg",
    "https://libgen.li/covers/redirected.jpg",
    "https://libgen.bz/covers/safe.jpg",
  ]);
});

test("redirect loops stop after a bounded number of requests", async (context) => {
  let requests = 0;
  context.mock.method(globalThis, "fetch", async () => {
    requests++;
    return new Response(null, { status: 308, headers: { Location: "/covers/loop.jpg" } });
  });
  await assert.rejects(
    getCachedBookCover("https://libgen.li/covers/loop.jpg", directory),
    /redirect could not be followed/,
  );
  assert.equal(requests, 6);
});

test("DNS address filtering blocks private, reserved and IPv4-mapped IPv6 destinations", () => {
  for (const address of [
    "0.0.0.0",
    "10.1.2.3",
    "100.64.0.1",
    "100.127.255.254",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "172.31.255.255",
    "192.0.0.8",
    "192.0.2.1",
    "192.168.1.1",
    "198.18.0.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "fc00::1",
    "fd00::1",
    "fe80::1",
    "ff02::1",
    "::ffff:127.0.0.1",
    "::ffff:8.8.8.8",
    "64:ff9b::7f00:1",
    "2001::1",
    "2001:db8::1",
    "2002:7f00:1::1",
    "3fff::1",
    "not an address",
  ])
    assert.equal(isPublicCoverAddress(address), false, address);
  for (const address of [
    "8.8.8.8",
    "1.1.1.1",
    "100.128.0.1",
    "172.15.255.255",
    "172.32.0.1",
    "2001:4860:4860::8888",
    "2606:4700:4700::1111",
  ]) {
    assert.equal(isPublicCoverAddress(address), true, address);
  }
});

test("connection lookup returns only the exact validated DNS results and blocks mixed public/private answers", async (context) => {
  let records: LookupAddress[] = [{ address: "8.8.8.8", family: 4 }];
  let calls = 0;
  context.mock.method(
    dns,
    "lookup",
    (_hostname: string, options: dns.LookupAllOptions, callback: (error: null, records: LookupAddress[]) => void) => {
      calls++;
      assert.equal(options.all, true);
      callback(null, records);
    },
  );
  assert.deepEqual(await lookup(), records);
  assert.equal(calls, 1);
  assert.equal(await lookup(false), "8.8.8.8");
  records = [...records, { address: "127.0.0.1", family: 4 }];
  await assert.rejects(lookup(), CoverSecurityError);
  records = [{ address: "::ffff:127.0.0.1", family: 6 }];
  await assert.rejects(lookup(), CoverSecurityError);
  records = [];
  await assert.rejects(lookup(), CoverSecurityError);
});

test("the real cover dispatcher rejects private DNS results before connecting to a private service", async (context) => {
  let lookups = 0;
  context.mock.method(
    dns,
    "lookup",
    (_hostname: string, _options: dns.LookupAllOptions, callback: (error: null, records: LookupAddress[]) => void) => {
      lookups++;
      callback(null, [{ address: "127.0.0.1", family: 4 }]);
    },
  );
  await assert.rejects(
    getCachedFullSizeBookCover("https://libgen.la/covers/rebound_small.jpg", directory),
    (error: Error & { cause?: unknown }) => {
      return error.cause instanceof CoverSecurityError;
    },
  );
  assert.equal(lookups, 1, "unsafe DNS results must not trigger a thumbnail retry");
});

test("a redirect through an allowed mirror still cannot reach a private service on a later hop", async (context) => {
  const requests: string[] = [];
  context.mock.method(globalThis, "fetch", async (input: URL) => {
    requests.push(input.toString());
    return new Response(null, {
      status: 302,
      headers: {
        Location: requests.length === 1 ? "https://libgen.bz/covers/hop.jpg" : "https://169.254.169.254/private.jpg",
      },
    });
  });
  await assert.rejects(getCachedBookCover("https://libgen.li/covers/multi-hop.jpg", directory), CoverSecurityError);
  assert.deepEqual(requests, ["https://libgen.li/covers/multi-hop.jpg", "https://libgen.bz/covers/hop.jpg"]);
});
