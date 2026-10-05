import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

import { SearchType } from "../src/types";
import { getLibgenSearchResults } from "../src/utils/api";
import { getCachedBookCover, getCachedFullSizeBookCover } from "../src/utils/api/covers";
import { getValidatedMirror, mirror, mirrors, testMirror } from "../src/utils/api/mirrors";
import { fetchLibgenPage, fetchLibgenSearchPage } from "../src/utils/api/request";
import { fitCoverPreview } from "../src/utils/cover-preview";

const resultsPage = `<table id="tablelibgen"><tbody><tr>
  <td><a><img src="/covers/alice.jpg"></a></td>
  <td><a href="edition.php?id=1">Alice in Wonderland</a></td>
  <td>Lewis Carroll</td><td>Publisher</td><td>1865</td><td>English</td><td>200</td>
  <td><a>1 MB</a></td><td>epub</td><td><a href="ads.php?md5=abc123">Download</a></td>
</tr></tbody></table>`;
const emptyPage = `<form id="formlibgen"><input name="req"></form>
  <ul class="nav-tabs"><li><a class="nav-link active">Files <span class="badge">0</span></a></li></ul>`;
const placeholderPage = "<title>Welcome to nginx!</title><h1>Welcome to nginx!</h1>";
const requests: { url: URL; userAgent: string | undefined; referer: string | undefined }[] = [];
let baseUrl: string;
let coverCache: string;
const coverImage = Buffer.from("/9j/2Q==", "base64");

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  requests.push({ url, userAgent: request.headers["user-agent"], referer: request.headers.referer });
  response.setHeader("Content-Type", "text/html");
  if (url.pathname.startsWith("/covers/")) {
    response.setHeader("Content-Type", "image/jpeg");
    if (url.pathname === "/covers/missing.jpg") {
      response.writeHead(404).end();
    } else if (url.pathname === "/covers/empty.jpg" || request.headers.referer !== `${baseUrl}/index.php`) {
      response.end();
    } else if (url.pathname === "/covers/slow.jpg") {
      response.write(coverImage.subarray(0, 2));
      setTimeout(() => response.end(coverImage.subarray(2)), 100);
    } else {
      response.end(coverImage);
    }
  } else if (url.pathname.startsWith("/unavailable")) {
    response.writeHead(503).end("Service unavailable");
  } else if (url.pathname.startsWith("/disconnected")) {
    request.socket.destroy();
  } else if (url.pathname.startsWith("/hanging")) {
    response.write(resultsPage.slice(0, 20));
  } else if (url.pathname.startsWith("/slow")) {
    response.write(resultsPage.slice(0, 20));
    setTimeout(() => response.end(resultsPage.slice(20)), 100);
  } else if (url.pathname.startsWith("/placeholder") || request.headers["user-agent"] !== "Raycast-Library-Genesis") {
    response.end(placeholderPage);
  } else if (url.searchParams.get("req") === "no-match") {
    response.end(emptyPage);
  } else {
    response.end(resultsPage);
  }
});

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  coverCache = await mkdtemp(join(tmpdir(), "libgen-cover-test-"));
});

after(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await rm(coverCache, { recursive: true, force: true });
});

test("covers include the required referrer and are reused from the local cache", async () => {
  const url = `${baseUrl}/covers/alice.jpg`;
  const path = await getCachedBookCover(url, coverCache);
  assert.deepEqual(await readFile(path), coverImage);
  assert.equal(requests.at(-1)!.referer, `${baseUrl}/index.php`);
  assert.equal(requests.at(-1)!.userAgent, "Raycast-Library-Genesis");
  const count = requests.length;
  assert.equal(await getCachedBookCover(url, coverCache), path);
  assert.equal(requests.length, count);
});

test("empty images, placeholder pages and HTTP failures are not cached as covers", async () => {
  const before = await readdir(join(coverCache, "covers"));
  await assert.rejects(getCachedBookCover(`${baseUrl}/covers/empty.jpg`, coverCache), /empty cover/);
  await assert.rejects(getCachedBookCover(`${baseUrl}/placeholder`, coverCache), /did not return a cover/);
  await assert.rejects(getCachedBookCover(`${baseUrl}/unavailable`, coverCache), /did not return a cover/);
  assert.deepEqual(await readdir(join(coverCache, "covers")), before);
});

test("cancelled cover downloads leave no partial image in the cache", async () => {
  const before = await readdir(join(coverCache, "covers"));
  const controller = new AbortController();
  const pending = getCachedBookCover(`${baseUrl}/covers/slow.jpg`, coverCache, controller.signal);
  setTimeout(() => controller.abort(), 20);
  await assert.rejects(pending, (error: Error) => error.name === "AbortError");
  assert.deepEqual(await readdir(join(coverCache, "covers")), before);
});

test("full-size covers are preferred, with a thumbnail fallback when the original is missing", async () => {
  const fullSizePath = await getCachedBookCover(`${baseUrl}/covers/alice.jpg`, coverCache);
  assert.equal(await getCachedFullSizeBookCover(`${baseUrl}/covers/alice_small.jpg`, coverCache), fullSizePath);

  const requestCount = requests.length;
  const fallbackPath = await getCachedFullSizeBookCover(`${baseUrl}/covers/missing_small.jpg`, coverCache);
  assert.deepEqual(await readFile(fallbackPath), coverImage);
  assert.deepEqual(
    requests.slice(requestCount).map((request) => request.url.pathname),
    ["/covers/missing.jpg", "/covers/missing_small.jpg"],
  );
});

test("cancelling a full-size cover request does not start a thumbnail fallback", async () => {
  const controller = new AbortController();
  const requestCount = requests.length;
  const pending = getCachedFullSizeBookCover(`${baseUrl}/covers/slow_small.jpg`, coverCache, controller.signal);
  setTimeout(() => controller.abort(), 20);
  await assert.rejects(pending, (error: Error) => error.name === "AbortError");
  assert.deepEqual(
    requests.slice(requestCount).map((request) => request.url.pathname),
    ["/covers/slow.jpg"],
  );
});

test("cover previews fit portrait and landscape images without changing their proportions", () => {
  assert.deepEqual(fitCoverPreview(600, 900), { width: 160, height: 240 });
  assert.deepEqual(fitCoverPreview(1200, 400), { width: 300, height: 100 });
  assert.deepEqual(fitCoverPreview(60, 90), { width: 60, height: 90 });
});

test("search uses the accepted user agent and parses real results", async () => {
  const books = await getLibgenSearchResults(
    "Alice in Wonderland",
    `${baseUrl}/healthy/`,
    new AbortController().signal,
    SearchType.NonFiction,
  );
  assert.equal(books.length, 1);
  assert.equal(books[0].title, "Alice in Wonderland");
  assert.equal(books[0].author, "Lewis Carroll");
  assert.equal(books[0].coverUrl, `${baseUrl}/covers/alice.jpg`);
  const request = requests.at(-1)!;
  assert.equal(request.userAgent, "Raycast-Library-Genesis");
  assert.equal(request.url.pathname, "/healthy/index.php");
  assert.deepEqual(request.url.searchParams.getAll("topics[]"), ["l", "a", "m", "s"]);
});

test("search keeps fiction and all-topic filters", async () => {
  await getLibgenSearchResults("Alice", baseUrl, new AbortController().signal, SearchType.Fiction);
  assert.deepEqual(requests.at(-1)!.url.searchParams.getAll("topics[]"), ["f", "r", "c"]);
  await getLibgenSearchResults("Alice", baseUrl, new AbortController().signal, SearchType.All);
  assert.deepEqual(requests.at(-1)!.url.searchParams.getAll("topics[]"), ["f", "r", "c", "l", "a", "m", "s"]);
});

test("a genuine zero-result page remains an empty result", async () => {
  const books = await getLibgenSearchResults("no-match", baseUrl, new AbortController().signal, SearchType.NonFiction);
  assert.deepEqual(books, []);
});

test("HTTP 200 placeholder pages reject instead of becoming zero results", async () => {
  await assert.rejects(
    getLibgenSearchResults("Alice", `${baseUrl}/placeholder`, new AbortController().signal, SearchType.NonFiction),
    /did not return a Library Genesis search page/,
  );
});

test("HTTP failures and network failures propagate to the search caller", async () => {
  await assert.rejects(
    getLibgenSearchResults("Alice", `${baseUrl}/unavailable`, new AbortController().signal, SearchType.NonFiction),
    /HTTP 503/,
  );
  await assert.rejects(
    getLibgenSearchResults("Alice", `${baseUrl}/disconnected`, new AbortController().signal, SearchType.NonFiction),
    { name: "TypeError", message: "fetch failed" },
  );
});

test("request timeout covers reading the response body", async () => {
  await assert.rejects(fetchLibgenSearchPage(`${baseUrl}/slow`, undefined, 20), /timed out/);
});

test("aborting an active request preserves cancellation", async () => {
  const controller = new AbortController();
  const pending = fetchLibgenPage(`${baseUrl}/slow`, controller.signal);
  setTimeout(() => controller.abort(), 20);
  await assert.rejects(pending, (error: Error) => error.name === "AbortError");
});

test("an already cancelled request never reaches the server", async () => {
  const controller = new AbortController();
  controller.abort();
  const count = requests.length;
  await assert.rejects(fetchLibgenPage(baseUrl, controller.signal), (error: Error) => error.name === "AbortError");
  assert.equal(requests.length, count);
});

test("mirror checks perform a small search and reject placeholders and HTTP errors", async () => {
  const timing = await testMirror(`${baseUrl}/healthy`);
  assert.ok(timing.endTime >= timing.startTime);
  const request = requests.at(-1)!;
  assert.equal(request.url.pathname, "/healthy/index.php");
  assert.equal(request.url.searchParams.get("res"), "1");
  await assert.rejects(testMirror(`${baseUrl}/placeholder`), /did not return a Library Genesis search page/);
  await assert.rejects(testMirror(`${baseUrl}/unavailable`), /HTTP 503/);
});

test("automatic mirror selection excludes reachable but invalid mirrors", async (context) => {
  const original = mirrors.slice();
  context.mock.method(console, "error", () => {});
  const parse = original[0].parse;
  try {
    mirrors.splice(
      0,
      mirrors.length,
      { baseUrl: `${baseUrl}/placeholder`, parse },
      { baseUrl: `${baseUrl}/healthy`, parse },
    );
    assert.equal(await mirror(), `${baseUrl}/healthy`);
    mirrors.splice(1, 1, { baseUrl: `${baseUrl}/unavailable`, parse });
    assert.equal(await mirror(), null);
  } finally {
    mirrors.splice(0, mirrors.length, ...original);
  }
});

test("a healthy mirror is selected without waiting for an unreachable candidate", async () => {
  const original = mirrors.slice();
  const parse = original[0].parse;
  try {
    mirrors.splice(
      0,
      mirrors.length,
      { baseUrl: `${baseUrl}/hanging`, parse },
      { baseUrl: `${baseUrl}/healthy`, parse },
    );
    assert.equal(await mirror(AbortSignal.timeout(1000)), `${baseUrl}/healthy`);
  } finally {
    mirrors.splice(0, mirrors.length, ...original);
  }
});

test("a cached mirror is checked before reuse without probing alternatives when it is healthy", async () => {
  const count = requests.length;
  assert.equal(await getValidatedMirror(`${baseUrl}/healthy`), `${baseUrl}/healthy`);
  assert.deepEqual(
    requests.slice(count).map((request) => request.url.pathname),
    ["/healthy/index.php"],
  );
});

test("a failed cached mirror is replaced and the same search succeeds on the replacement", async () => {
  const original = mirrors.slice();
  const parse = original[0].parse;
  try {
    mirrors.splice(
      0,
      mirrors.length,
      { baseUrl: `${baseUrl}/placeholder`, parse },
      { baseUrl: `${baseUrl}/healthy`, parse },
    );
    for (const cachedPath of ["placeholder", "unavailable", "disconnected"]) {
      const count = requests.length;
      const replacement = await getValidatedMirror(`${baseUrl}/${cachedPath}`);
      assert.equal(replacement, `${baseUrl}/healthy`);
      assert.equal(
        requests.slice(count).filter((request) => request.url.pathname === `/${cachedPath}/index.php`).length,
        1,
      );
      const books = await getLibgenSearchResults(
        "Alice",
        replacement,
        new AbortController().signal,
        SearchType.NonFiction,
      );
      assert.equal(books[0].title, "Alice in Wonderland");
    }
  } finally {
    mirrors.splice(0, mirrors.length, ...original);
  }
});

test("cancelling a cached mirror check does not start alternative probes", async () => {
  const controller = new AbortController();
  const count = requests.length;
  const pending = getValidatedMirror(`${baseUrl}/slow`, controller.signal);
  setTimeout(() => controller.abort(), 20);
  assert.equal(await pending, null);
  assert.deepEqual(
    requests.slice(count).map((request) => request.url.pathname),
    ["/slow/index.php"],
  );
});

test("a failed cached mirror returns no replacement when every candidate is unavailable", async (context) => {
  const original = mirrors.slice();
  context.mock.method(console, "error", () => {});
  try {
    mirrors.splice(0, mirrors.length, { baseUrl: `${baseUrl}/unavailable`, parse: original[0].parse });
    assert.equal(await getValidatedMirror(`${baseUrl}/placeholder`), null);
  } finally {
    mirrors.splice(0, mirrors.length, ...original);
  }
});
