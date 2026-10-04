import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

import { SearchType } from "../src/types";
import { getLibgenSearchResults } from "../src/utils/api";
import { mirror, mirrors, testMirror } from "../src/utils/api/mirrors";
import { fetchLibgenPage, fetchLibgenSearchPage } from "../src/utils/api/request";

const resultsPage = `<table id="tablelibgen"><tbody><tr>
  <td><a><img src="/covers/alice.jpg"></a></td>
  <td><a href="edition.php?id=1">Alice in Wonderland</a></td>
  <td>Lewis Carroll</td><td>Publisher</td><td>1865</td><td>English</td><td>200</td>
  <td><a>1 MB</a></td><td>epub</td><td><a href="ads.php?md5=abc123">Download</a></td>
</tr></tbody></table>`;
const emptyPage = `<form id="formlibgen"><input name="req"></form>
  <ul class="nav-tabs"><li><a class="nav-link active">Files <span class="badge">0</span></a></li></ul>`;
const placeholderPage = "<title>Welcome to nginx!</title><h1>Welcome to nginx!</h1>";
const requests: { url: URL; userAgent: string | undefined }[] = [];
let baseUrl: string;

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  requests.push({ url, userAgent: request.headers["user-agent"] });
  response.setHeader("Content-Type", "text/html");
  if (url.pathname.startsWith("/unavailable")) {
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
});

after(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
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
    /socket hang up/,
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
