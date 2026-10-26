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
function load(entry, stubs = {}) {
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
    runInNewContext(outputText, { module, exports: module.exports, require, URL, console });
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
