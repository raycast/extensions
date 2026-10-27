import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const root = fileURLToPath(new URL("../src/", import.meta.url));
const nativeRequire = createRequire(import.meta.url);

// Loads real modules from src. Stubs are keyed by src-relative path ("lib/fetchProviderJson") or
// package name, so the same stub applies no matter which file imports it.
function load(entry, stubs = {}, globals = {}) {
  const cache = new Map();

  function resolve(fromDir, specifier) {
    if (!specifier.startsWith(".")) return { key: specifier };
    const file = path.join(fromDir, specifier);
    return { key: path.relative(root, file), file: `${file}.ts` };
  }

  function loadFile(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023, esModuleInterop: true },
    });
    const module = { exports: {} };
    cache.set(file, module);
    const require = (specifier) => {
      const { key, file: target } = resolve(path.dirname(file), specifier);
      if (key in stubs) return stubs[key];
      return target ? loadFile(target) : nativeRequire(specifier);
    };
    runInNewContext(outputText, { module, exports: module.exports, require, URL, console, ...globals });
    return module.exports;
  }

  return loadFile(path.join(root, `${entry}.ts`));
}

function raycastApi(prefs = {}) {
  return { getPreferenceValues: () => ({ giphyLocale: "en", klipyLocale: "en", maxResults: "20", ...prefs }) };
}

function giphyFixture(type, id) {
  const image = { url: `https://media.giphy.com/media/${id}/giphy.gif`, width: "200", height: "200", size: "1000" };
  return {
    id,
    type,
    title: `${id} title`,
    slug: id,
    url: `https://giphy.com/${type === "sticker" ? "stickers" : "gifs"}/${id}`,
    import_datetime: "2026-01-01 00:00:00",
    images: { original: image, preview_gif: image, fixed_height_small: image },
  };
}

function withFetch(responder) {
  const requests = [];
  const stub = {
    async fetchProviderJson(url, options) {
      requests.push({ url: new URL(url.toString()), options });
      return responder(new URL(url.toString()), options);
    },
  };
  return { requests, stub };
}

test("GIPHY Stickers searches the sticker catalog and labels its errors", async () => {
  const { requests, stub } = withFetch(() => ({ data: [giphyFixture("sticker", "abc")] }));
  const { default: giphy } = load("models/giphy", { "@raycast/api": raycastApi(), "lib/fetchProviderJson": stub });

  const api = await giphy("stickers");
  const { results } = await api.search("side eye", { limit: 5 });

  assert.equal(requests[0].url.searchParams.get("type"), "stickers");
  assert.equal(requests[0].url.searchParams.get("q"), "side eye");
  assert.equal(requests[0].url.searchParams.get("limit"), "5");
  assert.equal(requests[0].options.provider, "GIPHY Stickers");
  assert.equal(results[0].url, "https://giphy.com/stickers/abc");
  assert.equal(results[0].download_name, "abc-title.gif");
});

test("GIPHY GIFs and Clips keep their provider names", async () => {
  const { requests, stub } = withFetch(() => ({ data: [] }));
  const { default: giphy } = load("models/giphy", { "@raycast/api": raycastApi(), "lib/fetchProviderJson": stub });

  await (await giphy()).trending({ limit: 1 });
  await (await giphy("videos")).trending({ limit: 1 });

  assert.deepEqual(
    requests.map((request) => [request.options.provider, request.url.searchParams.get("type")]),
    [
      ["GIPHY", null],
      ["GIPHY Clips", "videos"],
    ],
  );
});

test("sticker page URLs resolve to the GIPHY Stickers service", () => {
  const { getServiceFromUrl } = load("lib/getServiceFromUrl");
  const gif = (url) => ({ url, download_url: "" });

  assert.equal(getServiceFromUrl(gif("https://giphy.com/stickers/abc")), "giphy-stickers");
  assert.equal(getServiceFromUrl(gif("https://giphy.com/gifs/abc")), "giphy");
  assert.equal(getServiceFromUrl(gif("https://giphy.com/clips/abc")), "giphy-clips");
});

test("favorites and recents include GIPHY Stickers", () => {
  const { getServices } = load("preferences", { "@raycast/api": raycastApi() });

  assert.ok(getServices().includes("giphy-stickers"));
  assert.ok(!getServices().includes("favorites"));
  assert.ok(!getServices().includes("recents"));
});

test("All Sources searches GIF providers only and is never stored as a provider", () => {
  const { getAllSourcesServices, getServices, isServiceName } = load("preferences", { "@raycast/api": raycastApi() });

  assert.deepEqual([...getAllSourcesServices()], ["giphy", "klipy"]);
  assert.ok(isServiceName("all"));
  assert.ok(!getServices().includes("all"));
});

test("All Sources has no API of its own and is not a cache owner", async () => {
  const stubs = {
    "@raycast/api": { ...raycastApi(), environment: { supportPath: "/support" } },
    "@raycast/utils": { useCachedPromise() {} },
  };
  const { getAPIByServiceName } = load("hooks/useSearchAPI", stubs);
  const { isCacheableService } = load("lib/cachedGifs", stubs);

  assert.equal(await getAPIByServiceName("all"), null);
  assert.equal(isCacheableService("all"), false);
  assert.equal(isCacheableService("giphy-stickers"), true);
});

function gifs(prefix, count) {
  return Array.from({ length: count }, (_, index) => ({ id: `${prefix}${index}` }));
}

function loadAllSources() {
  return load("lib/allSources");
}

test("All Sources mixes providers one GIF at a time and keeps the leftovers", () => {
  const { interleave } = loadAllSources();
  assert.deepEqual([...interleave([["g0", "g1", "g2"], ["k0"]])], ["g0", "k0", "g1", "g2"]);
  assert.deepEqual([...interleave([])], []);
});

test("All Sources pages every provider with its own cursor or offset", async () => {
  const { fetchAllSourcesPage } = loadAllSources();
  const calls = [];
  const load = async (service, opt) => {
    calls.push({ service, ...opt });
    return service === "giphy" ? { results: gifs("g", 2) } : { results: gifs("k", 2), next: "cursor-2" };
  };

  const first = await fetchAllSourcesPage(["giphy", "klipy"], {}, 2, load);
  assert.deepEqual([...first.results.map((gif) => gif.id)], ["g0", "k0", "g1", "k1"]);
  assert.equal(first.hasMore, true);

  calls.length = 0;
  await fetchAllSourcesPage(["giphy", "klipy"], first.cursor, 2, load);
  assert.deepEqual(
    calls.map((call) => ({ ...call })),
    [
      { service: "giphy", next: undefined, offset: 2 },
      { service: "klipy", next: "cursor-2", offset: 2 },
    ],
  );
});

test("All Sources stops asking a provider once it runs out", async () => {
  const { fetchAllSourcesPage } = loadAllSources();
  const calls = [];
  const load = async (service) => {
    calls.push(service);
    return service === "giphy" ? { results: gifs("g", 1) } : { results: gifs("k", 2), next: "" };
  };

  const first = await fetchAllSourcesPage(["giphy", "klipy"], {}, 2, load);
  assert.equal(first.hasMore, false, "GIPHY returned a short page and Klipy returned no next cursor");

  calls.length = 0;
  const second = await fetchAllSourcesPage(["giphy", "klipy"], first.cursor, 2, load);
  assert.deepEqual([...calls], []);
  assert.equal(second.results.length, 0);
});

test("All Sources keeps the working provider and drops a failing one", async () => {
  const { fetchAllSourcesPage } = loadAllSources();
  const load = async (service) => {
    if (service === "klipy") throw new Error("offline");
    return { results: gifs("g", 2) };
  };

  const first = await fetchAllSourcesPage(["giphy", "klipy"], {}, 2, load);
  assert.deepEqual([...first.results.map((gif) => gif.id)], ["g0", "g1"]);
  assert.deepEqual([...first.failures.map((failure) => failure.service)], ["klipy"]);
  assert.match(first.failures[0].error.message, /offline/);
  assert.equal(first.allFailed, false);
  assert.equal(first.hasMore, true);
  assert.equal(first.cursor.klipy.done, true);
});

test("All Sources reports a failure, not an empty search, when every provider fails", async () => {
  const { fetchAllSourcesPage } = loadAllSources();
  const load = async () => {
    throw new Error("offline");
  };

  const page = await fetchAllSourcesPage(["giphy", "klipy"], {}, 2, load);
  assert.equal(page.allFailed, true);
  assert.equal(page.hasMore, false);
  assert.deepEqual([...page.failures.map((failure) => failure.service)], ["giphy", "klipy"]);
});

test("square copies read the GIF rendition, since a Clip's download is an MP4", async () => {
  const fetched = [];
  const { default: resolveSquareGifFile } = load(
    "lib/resolveSquareGifFile",
    {
      "@raycast/api": { environment: { supportPath: "/support" } },
      tempy: { write: async () => "/tmp/in.gif", file: () => "/tmp/out.gif" },
      child_process: { execFile: (_cmd, _args, callback) => callback(null, "", "") },
      fs: { existsSync: () => true, mkdirSync() {} },
      "fs/promises": { readFile: async () => "", writeFile: async () => {}, unlink: async () => {} },
      "lib/cachedGifs": { getDisplayName: () => "clip.gif" },
    },
    {
      Buffer,
      process: { platform: "darwin" },
      fetch: async (url) => {
        fetched.push(url);
        return { ok: true, arrayBuffer: async () => new ArrayBuffer(0) };
      },
    },
  );

  const file = await resolveSquareGifFile({
    download_url: "https://media.giphy.com/media/abc/giphy360p.mp4",
    download_name: "clip.mp4",
    gif_url: "https://media.giphy.com/media/abc/giphy.gif",
  });

  assert.equal(file, "/tmp/out.gif");
  assert.deepEqual(fetched, ["https://media.giphy.com/media/abc/giphy.gif"]);
});

test("an All Sources request that finishes after a newer one doesn't report its failures", async () => {
  const reported = [];
  let loadPage;
  let release;
  const stalled = new Promise((resolve) => (release = resolve));
  let calls = 0;
  const { default: useAllSourcesSearch } = load("hooks/useAllSourcesSearch", {
    react: {
      useState: (initial) => [initial, (value) => reported.push(value)],
      useRef: (initial) => ({ current: initial }),
    },
    "@raycast/utils": {
      useCachedPromise: (fn, args) => {
        loadPage = fn(...args);
        return { data: [] };
      },
    },
    "hooks/useSearchAPI": {
      getAPIByServiceName: async (service) => ({
        search: async () => {
          // The first request's two provider calls wait, so it finishes after the second request.
          if (calls++ < 2) await stalled;
          if (service === "giphy") throw new Error("offline");
          return { results: [], next: "" };
        },
      }),
    },
    preferences: { getServiceTitle: (service) => service },
  });

  useAllSourcesSearch({ term: "cat", services: ["giphy", "klipy"], limit: 2, execute: true });
  const stale = loadPage({ page: 0 });
  const current = loadPage({ page: 0 });

  await current;
  assert.equal(reported.length, 1);
  assert.deepEqual(
    [...reported[0]].map((failure) => failure.service),
    ["giphy"],
  );

  release();
  await stale;
  assert.equal(reported.length, 1);
});
