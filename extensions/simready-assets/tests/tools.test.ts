import assert from "node:assert/strict";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { contentUrl, folderUrl, TREE_API_URL } from "../src/lib/assets";
import type { RepositoryEntry } from "../src/lib/assets";
import searchAssets from "../src/tools/search-assets";
import listAssetTypes from "../src/tools/list-asset-types";
import getAssetDetails from "../src/tools/get-asset-details";
import listAssetFiles from "../src/tools/list-asset-files";

const assetId = "food_produce_banana_m01";
const file = (path: string, size = 100): RepositoryEntry => ({ type: "file", path: `${assetId}/${path}`, size });
const directory = (path: string): RepositoryEntry => ({ type: "directory", path, size: 0 });
const catalog = [directory(assetId), directory("food_beverage_coffeeCup_a01"), directory("bodyPart_mirror_a01")];
const files = [
  file("simready_usd/banana.usd", 1000),
  file("simready_usd/Textures/banana_alb.png", 2000),
  file("simready_usd/Textures/banana_nor.png", 3000),
  file("simready_usd/Textures/.thumbs/256x256/banana_alb.png", 200),
  file("simready_usd/.thumbs/256x256/banana.usd_transparent.png", 500),
  file("simready_usd/payloads/geometries.usd", 4000),
  file(".metadata/LICENSE.txt"),
  file(".metadata/com.nvidia.simready.root_usds.json"),
  file("com.nvidia.simready.packaging.json"),
];

function mockDataset(t: TestContext, entries = files) {
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    calls.push(url);
    if (url === `${TREE_API_URL}?limit=1000&recursive=false`) return Response.json(catalog);
    if (url === `${TREE_API_URL}/${assetId}?limit=1000&recursive=true`) return Response.json(entries);
    if (url === contentUrl(`${assetId}/.metadata/com.nvidia.simready.root_usds.json`)) {
      return Response.json({ entries: ["simready_usd/banana.usd"] });
    }
    if (url === contentUrl(`${assetId}/com.nvidia.simready.packaging.json`)) {
      return Response.json({ license: "CC-BY-4.0" });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  return calls;
}

function assertSerializable(result: unknown) {
  assert.deepEqual(structuredClone(result), result);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
}

test("AI search filters the entire catalog, normalizes types, and returns bounded pages of public fields", async (t) => {
  const calls = mockDataset(t);
  const first = await searchAssets({ type: " food ", limit: 1 });
  assert.equal(first.total, 2);
  assert.equal(first.returned, 1);
  assert.equal(first.nextOffset, 1);
  assert.equal(first.hasMore, true);
  assert.equal(first.results[0].id, "food_beverage_coffeeCup_a01");
  assert.equal("searchText" in first.results[0], false);
  const second = await searchAssets({ type: "FOOD", limit: 1, offset: first.nextOffset! });
  assert.equal(second.results[0].id, assetId);
  assert.equal(second.results[0].url, folderUrl(assetId));
  assert.equal(second.nextOffset, null);
  assert.equal(second.hasMore, false);
  assert.equal(second.source.publisher, "NVIDIA");
  assert.ok(calls.every((url) => url === `${TREE_API_URL}?limit=1000&recursive=false`));
  assertSerializable(first);
  assertSerializable(second);
});

test("AI search supports keyword matching, no matches, and offsets beyond the final page", async (t) => {
  mockDataset(t);
  assert.equal((await searchAssets({ query: "coffee cup" })).results[0].id, "food_beverage_coffeeCup_a01");
  const empty = await searchAssets({ query: "zxqvunknown" });
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.results, []);
  const exhausted = await searchAssets({ offset: 100 });
  assert.equal(exhausted.total, 3);
  assert.equal(exhausted.hasMore, false);
  assert.equal(exhausted.nextOffset, null);
  assert.deepEqual(exhausted.results, []);
});

test("AI pagination rejects invalid limits and offsets before making requests", async (t) => {
  const calls = mockDataset(t);
  for (const limit of [0, -1, 51, 1.5, NaN, Infinity]) await assert.rejects(searchAssets({ limit }), /limit must/);
  for (const offset of [-1, 0.5, NaN, Infinity]) await assert.rejects(searchAssets({ offset }), /offset must/);
  await assert.rejects(listAssetFiles({ assetId, limit: 101 }), /limit must/);
  await assert.rejects(listAssetFiles({ assetId, offset: -1 }), /offset must/);
  assert.deepEqual(calls, []);
});

test("AI type discovery returns counts and supports filtering without inspecting asset folders", async (t) => {
  const calls = mockDataset(t);
  const all = await listAssetTypes({});
  assert.deepEqual(all.types, [
    { type: "Body Part", count: 1 },
    { type: "Food", count: 2 },
  ]);
  assert.equal(all.catalogSize, 3);
  const filtered = await listAssetTypes({ query: "body part" });
  assert.equal(filtered.totalTypes, 2);
  assert.deepEqual(filtered.types, [{ type: "Body Part", count: 1 }]);
  assert.ok(calls.every((url) => !url.includes("recursive=true")));
  assertSerializable(all);
});

test("AI details expose real preview and download URLs, dependency guidance, and plain data without fetching content", async (t) => {
  const calls = mockDataset(t);
  const result = await getAssetDetails({ assetId });
  assert.equal(result.id, assetId);
  assert.equal(result.fileCount, 9);
  assert.equal(result.totalSizeBytes, 11000);
  assert.equal(result.license, "CC-BY-4.0");
  assert.equal(result.modelCount, 1);
  assert.equal(result.models[0].relativePath, "simready_usd/banana.usd");
  assert.equal(result.models[0].downloadUrl, contentUrl(`${assetId}/simready_usd/banana.usd`, true));
  assert.equal(result.previewUrl, contentUrl(`${assetId}/simready_usd/.thumbs/256x256/banana.usd_transparent.png`));
  assert.ok(result.download.command.includes(`--include '${assetId}/**'`));
  assert.ok(result.download.note.includes("textures, materials, and payloads"));
  assert.deepEqual(
    result.fileGroups.find((group) => group.group === "Textures"),
    { group: "Textures", count: 2, sizeBytes: 5000 },
  );
  assert.equal(calls.length, 3);
  assert.ok(calls.every((url) => url.includes("/tree/") || url.endsWith(".json")));
  assertSerializable(result);
});

test("AI details preserve missing metadata rather than inventing a license or preview", async (t) => {
  mockDataset(t, [file("simready_usd/banana.usd")]);
  const result = await getAssetDetails({ assetId });
  assert.equal(result.license, null);
  assert.equal(result.licenseUrl, null);
  assert.equal(result.previewUrl, null);
  assertSerializable(result);
});

test("AI file search distinguishes texture maps from thumbnails and paginates filtered matches", async (t) => {
  mockDataset(t);
  const first = await listAssetFiles({ assetId, group: "Textures", limit: 1 });
  assert.equal(first.fileCount, 9);
  assert.equal(first.total, 2);
  assert.equal(first.returned, 1);
  assert.equal(first.nextOffset, 1);
  const second = await listAssetFiles({ assetId, group: "Textures", limit: 1, offset: first.nextOffset! });
  assert.equal(second.results[0].relativePath, "simready_usd/Textures/banana_nor.png");
  assert.equal(second.nextOffset, null);
  assert.equal(second.hasMore, false);
  const filtered = await listAssetFiles({ assetId, group: "Textures", query: "banana alb" });
  assert.equal(filtered.total, 1);
  assert.equal(filtered.results[0].path, `${assetId}/simready_usd/Textures/banana_alb.png`);
  assert.ok(filtered.results[0].downloadUrl.endsWith("?download=true"));
  assertSerializable(filtered);
});

test("AI tools reject unsafe asset IDs before constructing download commands or file links", async (t) => {
  const calls = mockDataset(t);
  for (const invalid of ["../outside", "", "folder/subfolder", "https://example.com/asset"]) {
    await assert.rejects(getAssetDetails({ assetId: invalid }), /Invalid asset identifier/);
    await assert.rejects(listAssetFiles({ assetId: invalid }), /Invalid asset identifier/);
  }
  assert.deepEqual(calls, []);
});

test("AI tools surface upstream failures instead of returning invented results or successful downloads", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("unavailable", { status: 503 }));
  await assert.rejects(searchAssets({ query: "banana" }), /HTTP 503/);
  await assert.rejects(listAssetTypes({}), /HTTP 503/);
  await assert.rejects(getAssetDetails({ assetId }), /HTTP 503/);
  await assert.rejects(listAssetFiles({ assetId }), /HTTP 503/);
});
