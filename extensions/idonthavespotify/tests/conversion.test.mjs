import assert from "node:assert/strict";
import { after, beforeEach, test, mock } from "node:test";
import { createRequire } from "node:module";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";

const temp = await mkdtemp(join(tmpdir(), "idhs-tests-"));
const bundle = await build({
  stdin: {
    contents: `
      export * from './src/shared/links';
      export * from './src/shared/conversion';
      export * from './src/shared/searchToClipboard';
      export * from './src/utils/cache';
      export * from './src/constants';
      export { default as convertLink } from './src/tools/convert-link';
      export { default as getSupportedPlatforms } from './src/tools/get-supported-platforms';
    `,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  write: false,
  plugins: [
    {
      name: "raycast-test-api",
      setup(build) {
        build.onResolve({ filter: /^@raycast\/api$/ }, () => ({ path: "api", namespace: "mock" }));
        build.onLoad({ filter: /.*/, namespace: "mock" }, () => ({
          contents: `
        export const getPreferenceValues = () => globalThis.testPreferences;
        export class Cache {
          get(key) { return globalThis.testCache.get(key); }
          set(key, value) { globalThis.testCache.set(key, value); }
          remove(key) { globalThis.testCache.delete(key); }
        }
        export const Clipboard = {
          readText: async () => globalThis.testClipboard,
          copy: async (text) => { globalThis.testCopied = text; }
        };
        export const Toast = { Style: { Animated: 'animated', Success: 'success', Failure: 'failure' } };
        export const showToast = async (style, title) => {
          globalThis.testToast = { style, title };
          return globalThis.testToast;
        };
      `,
        }));
      },
    },
  ],
});
const bundlePath = join(temp, "bundle.cjs");
await writeFile(bundlePath, bundle.outputFiles[0].text);
const api = createRequire(import.meta.url)(bundlePath);
after(() => rm(temp, { recursive: true, force: true }));

const source = "https://open.spotify.com/track/example";
const destination = "https://music.apple.com/us/song/example/123";
const fixture = (extra = {}) => ({
  id: "example",
  type: "song",
  title: "Example song",
  description: "Example artist",
  source: "spotify",
  universalLink: "https://idhs.example.com/?id=example",
  links: [{ type: "appleMusic", url: destination, isVerified: true }],
  ...extra,
});
const respond = (data = fixture(), status = 200) => {
  return mock.method(globalThis, "fetch", async () => Response.json(data, { status }));
};
beforeEach(() => {
  mock.restoreAll();
  globalThis.testPreferences = { instanceUrl: "https://idhs.example.com" };
  globalThis.testCache = new Map();
  globalThis.testClipboard = source;
  globalThis.testCopied = undefined;
  globalThis.testToast = undefined;
});

test("accepts trimmed HTTP links and rejects unsafe or invalid URLs", () => {
  assert.equal(api.isLinkValid(`  ${source}\n`), true);
  for (const value of ["", "song title", "javascript:alert(1)", "file:///tmp/music", "https://user:pass@example.com"]) {
    assert.equal(api.isLinkValid(value), false);
  }
});

test("automatic conversion is limited to known music hosts and the configured instance", () => {
  assert.equal(api.isKnownMusicLink(source, "https://idhs.example.com"), true);
  assert.equal(api.isKnownMusicLink("https://artist.bandcamp.com/track/example"), true);
  assert.equal(api.isKnownMusicLink("https://idhs.example.com/?id=example", "https://idhs.example.com"), true);
  for (const value of [
    "http://localhost/callback?code=secret",
    "https://example.com/song",
    "https://evil.spotify.com.attacker.test/track",
  ]) {
    assert.equal(api.isKnownMusicLink(value, "https://idhs.example.com"), false);
  }
});

test("supports complete universal URLs and encoded legacy IDs", () => {
  assert.equal(api.getUniversalUrl(fixture().universalLink, "https://idhs.example.com"), fixture().universalLink);
  const url = new URL(api.getUniversalUrl("a+b/c=&d", "https://idhs.example.com/base"));
  assert.equal(url.pathname, "/base");
  assert.equal(url.searchParams.get("id"), "a+b/c=&d");
});

test("automatic conversion accepts Google music shares without allowing unrelated Google pages", () => {
  for (const link of ["https://share.google/abc123", "https://www.google.com/gasearch?q=example&source=sh/x/gs/m2/5"]) {
    assert.equal(api.isKnownMusicLink(link), true, link);
  }
  for (const link of [
    "https://www.google.com/search?q=private",
    "https://www.google.com/gasearch/other",
    "https://docs.google.com/document/private",
    "https://www.google.com.attacker.test/gasearch",
    "https://share.google.attacker.test/abc123",
    "https://dzr.page.link/abc123",
  ]) {
    assert.equal(api.isKnownMusicLink(link), false, link);
  }
});

test("no-view commands convert Google music shares from the clipboard", async () => {
  for (const link of ["https://share.google/abc123", "https://www.google.com/gasearch?q=example"]) {
    const request = respond();
    globalThis.testClipboard = link;
    await api.searchToClipboard("appleMusic");
    assert.equal(JSON.parse(request.mock.calls[0].arguments[1].body).link, link);
    assert.equal(globalThis.testCopied, destination);
    mock.restoreAll();
  }
});

test("accepts absent artwork and removes unavailable results and extra service fields", () => {
  const result = api.parseSearchResult(
    fixture({
      internal: "private",
      links: [
        { type: "tidal", notAvailable: true },
        { type: "future-platform", url: "https://example.com/song", internal: "private" },
      ],
    }),
  );
  assert.equal(result.image, undefined);
  assert.equal(result.internal, undefined);
  assert.deepEqual(result.links, [{ type: "future-platform", url: "https://example.com/song", isVerified: undefined }]);
});

test("rejects malformed success payloads and unsafe destination URLs", () => {
  for (const value of [
    null,
    {},
    fixture({ title: "" }),
    fixture({ links: null }),
    fixture({ links: [{ type: "spotify", url: "javascript:alert(1)" }] }),
  ]) {
    assert.throws(() => api.parseSearchResult(value), /invalid response/);
  }
});

test("sends normalized input and selected adapter to the configured instance", async () => {
  const request = respond();
  await api.apiCall(` ${source} `, "appleMusic");
  const [url, options] = request.mock.calls[0].arguments;
  assert.equal(url, "https://idhs.example.com/api/search?v=1");
  assert.deepEqual(JSON.parse(options.body), { link: source, adapters: ["appleMusic"] });
});

test("invalid input, adapter, or instance fails before network access", async () => {
  const request = respond();
  await assert.rejects(api.apiCall("song title"), /valid HTTP/);
  await assert.rejects(api.apiCall(source, "unknown"), /Unsupported destination/);
  globalThis.testPreferences.instanceUrl = "https://example.com/?token=secret";
  await assert.rejects(api.apiCall(source), /Self-Hosted Instance URL/);
  assert.equal(request.mock.callCount(), 0);
});

test("auth, rate-limit, and service errors remain actionable even for HTML responses", async () => {
  for (const [status, message] of [
    [401, /self-hosted/],
    [403, /authentication/],
    [429, /Rate limit/],
    [503, /temporarily unavailable/],
  ]) {
    mock.method(globalThis, "fetch", async () => new Response("<html>Error</html>", { status }));
    await assert.rejects(api.apiCall(source), message);
    mock.restoreAll();
  }
});

test("malformed JSON and non-JSON success responses report a service error", async () => {
  for (const headers of [{ "content-type": "application/json" }, { "content-type": "text/html" }]) {
    mock.method(globalThis, "fetch", async () => new Response("invalid", { headers }));
    await assert.rejects(api.apiCall(source), /invalid response/);
    mock.restoreAll();
  }
});

test("network failures get a readable message", async () => {
  mock.method(globalThis, "fetch", async () => {
    throw new TypeError("fetch failed");
  });
  await assert.rejects(api.apiCall(source), /Could not reach/);
});

test("caller cancellation propagates without becoming a network error", async () => {
  const controller = new AbortController();
  mock.method(globalThis, "fetch", async (_url, { signal }) => {
    controller.abort();
    signal.throwIfAborted();
  });
  await assert.rejects(api.apiCall(source, undefined, controller.signal), { name: "AbortError" });
});

test("timeout reports a retryable error", async () => {
  mock.method(AbortSignal, "timeout", () => AbortSignal.abort(new DOMException("Timed out", "TimeoutError")));
  mock.method(globalThis, "fetch", async (_url, { signal }) => signal.throwIfAborted());
  await assert.rejects(api.apiCall(source), /timed out/);
});

test("AI conversion returns only requested matches and cloneable, explicit data", async () => {
  respond(fixture({ links: [...fixture().links, { type: "spotify", url: source }] }));
  const result = await api.convertLink({ link: source, platform: "appleMusic" });
  assert.deepEqual(result, structuredClone(result));
  assert.deepEqual(result.links, [
    { platform: "appleMusic", platformName: "Apple Music", url: destination, isVerified: true },
  ]);
  assert.equal(result.universalUrl, fixture().universalLink);
  assert.equal(globalThis.testCopied, undefined);
});

test("AI conversion omits adapter filtering for all-platform requests", async () => {
  const request = respond(fixture({ links: [{ type: "spotify", url: source }] }));
  const result = await api.convertLink({ link: source });
  assert.deepEqual(JSON.parse(request.mock.calls[0].arguments[1].body), { link: source });
  assert.equal(result.links[0].isVerified, false);
});

test("AI conversion reports missing matches without inventing a URL", async () => {
  respond(fixture({ links: [{ type: "tidal", url: "https://tidal.com/track/123", notAvailable: true }] }));
  const result = await api.convertLink({ link: source, platform: "tidal" });
  assert.deepEqual(result.links, []);
  assert.match(result.message, /No available match/);
});

test("supported platforms provide the nine exact adapter IDs", () => {
  const platforms = api.getSupportedPlatforms();
  assert.equal(platforms.length, 9);
  assert.deepEqual(
    platforms.find(({ id }) => id === "youTube"),
    { id: "youTube", name: "YouTube Music" },
  );
});

test("clipboard conversion copies an available destination and updates progress", async () => {
  respond();
  await api.searchToClipboard("appleMusic");
  assert.equal(globalThis.testCopied, destination);
  assert.equal(globalThis.testToast.style, "success");
});

test("clipboard conversion does not send links from unknown hosts", async () => {
  const request = respond();
  globalThis.testClipboard = "http://localhost/callback?code=secret";
  await api.searchToClipboard("appleMusic");
  assert.equal(request.mock.callCount(), 0);
  assert.equal(globalThis.testCopied, undefined);
  assert.match(globalThis.testToast.message, /supported music service/);
});

test("clipboard failures preserve the clipboard", async () => {
  respond(fixture({ links: [] }));
  await api.searchToClipboard("appleMusic");
  assert.equal(globalThis.testCopied, undefined);
  assert.equal(globalThis.testToast.style, "failure");
  assert.match(globalThis.testToast.message, /No available match/);
});

test("cache accepts fresh results but rejects expired or cross-instance entries", () => {
  api.cacheLastSearch(source, fixture());
  assert.equal(api.getLastSearch().link, source);
  globalThis.testPreferences.instanceUrl = "https://other.example.com";
  assert.equal(api.getLastSearch(), undefined);
  globalThis.testPreferences.instanceUrl = "https://idhs.example.com";
  mock.method(Date, "now", () => JSON.parse(globalThis.testCache.get("lastSearch")).savedAt + 3_600_001);
  assert.equal(api.getLastSearch(), undefined);
});

test("corrupt and legacy caches do not crash the command", () => {
  globalThis.testCache.set("lastSearch", "{broken");
  assert.equal(api.getLastSearch(), undefined);
  globalThis.testCache.set("lastSearch", JSON.stringify({ link: source, searchResult: fixture() }));
  assert.equal(api.getLastSearch(), undefined);
});
