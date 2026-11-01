import assert from "node:assert/strict";
import { test } from "node:test";
import {
  contentUrl,
  createCatalog,
  downloadCommand,
  fileGroup,
  fileUrl,
  folderUrl,
  formatBytes,
  searchAssets,
  summarizeAsset,
  TREE_API_URL,
} from "../src/lib/assets";
import type { RepositoryEntry } from "../src/lib/assets";
import { getAssetDetails, getCatalog, listTree, nextPageUrl } from "../src/lib/hugging-face";

const file = (path: string, size = 100): RepositoryEntry => ({ type: "file", path, size });
const directory = (path: string): RepositoryEntry => ({ type: "directory", path, size: 0 });
const assetId = "food_produce_banana_m01";
const rootPath = `${assetId}/simready_usd/sm_${assetId}_01.usd`;
const rootsPath = `${assetId}/.metadata/com.nvidia.simready.root_usds.json`;
const packagingPath = `${assetId}/com.nvidia.simready.packaging.json`;

test("catalog includes irregular asset names and excludes repository housekeeping", () => {
  const catalog = createCatalog([
    directory(".metadata"),
    directory("factory_bolt_m04_loose"),
    directory("screw_high_res"),
    directory("food_prepared_hot_dog_0"),
    directory("food/simready_usd"),
    file("README.md"),
  ]);
  assert.deepEqual(
    catalog.map((asset) => asset.id),
    ["factory_bolt_m04_loose", "food_prepared_hot_dog_0", "screw_high_res"],
  );
});

test("search matches words, camel case, IDs, variants, and types without fuzzy false positives", () => {
  const catalog = createCatalog([
    directory("food_beverage_coffeeCup_a01"),
    directory("food_beverage_coffeeCup_b02"),
    directory("bodyPart_car_side_mirror_a01"),
  ]);
  assert.equal(searchAssets(catalog, "COFFEE cup").length, 2);
  assert.equal(searchAssets(catalog, "food_beverage_coffeeCup_b02")[0]?.id, "food_beverage_coffeeCup_b02");
  assert.equal(searchAssets(catalog, "a01 coffee")[0]?.id, "food_beverage_coffeeCup_a01");
  assert.equal(searchAssets(catalog, "mirror", "Food").length, 0);
  assert.equal(searchAssets(catalog, "body part")[0]?.category, "Body Part");
  assert.equal(searchAssets(catalog, "cfe").length, 0);
});

test("URL builders preserve nested paths and encode URL and Markdown delimiters", () => {
  const path = "asset #1/texture (blue)+é.png";
  assert.equal(folderUrl("asset #1"), "https://huggingface.co/datasets/nvidia/simready-assets/tree/main/asset%20%231");
  assert.ok(fileUrl(path).endsWith("/blob/main/asset%20%231/texture%20%28blue%29%2B%C3%A9.png"));
  assert.ok(
    contentUrl(path, true).endsWith("/resolve/main/asset%20%231/texture%20%28blue%29%2B%C3%A9.png?download=true"),
  );
});

test("asset summaries select root models and small asset previews without loading texture maps", () => {
  const entries = [
    directory(`${assetId}/simready_usd`),
    file(rootPath, 10),
    file(`${assetId}/simready_usd/payloads/geometries.usd`, 20),
    file(`${assetId}/simready_usd/Textures/.thumbs/256x256/texture.png`, 1),
    file(`${assetId}/simready_usd/.thumbs/large.png`, 3 * 1024 * 1024),
    file(`${assetId}/simready_usd/.thumbs/model_thumbnail.png`, 200),
    file(`${assetId}/simready_usd/.thumbs/256x256/model.usd_transparent.png`, 100),
    file(`${assetId}/.metadata/LICENSE.txt`, 30),
    file("another_asset/model.usd", 999),
  ];
  const details = summarizeAsset(assetId, entries, [], "CC-BY-4.0");
  assert.deepEqual(
    details.models.map((model) => model.path),
    [rootPath],
  );
  assert.ok(details.preview?.path.endsWith("model.usd_transparent.png"));
  assert.equal(details.license, "CC-BY-4.0");
  assert.equal(details.licensePath, `${assetId}/.metadata/LICENSE.txt`);
  assert.equal(details.totalSize, 3 * 1024 * 1024 + 361);
  assert.equal(fileGroup(entries[1], details), "Models");
  assert.equal(fileGroup(entries[2], details), "Payloads");
  assert.equal(fileGroup(entries[3], details), "Previews");
});

test("declared model paths take precedence and missing thumbnails are supported", () => {
  const entries = [file(`${assetId}/custom/model.usda`), file(rootPath)];
  const details = summarizeAsset(assetId, entries, ["custom/model.usda"]);
  assert.deepEqual(
    details.models.map((model) => model.path),
    [`${assetId}/custom/model.usda`],
  );
  assert.equal(details.preview, undefined);
  assert.equal(summarizeAsset(assetId, [file(`${assetId}/simready_usd/model.usda`)]).models.length, 1);
});

test("folder download command scopes the download and quotes for POSIX and PowerShell", () => {
  assert.equal(
    downloadCommand(assetId, "darwin"),
    `hf download nvidia/simready-assets --repo-type dataset --revision main --include '${assetId}/**' --local-dir ./simready-assets`,
  );
  assert.ok(downloadCommand("box's", "darwin").includes(`'box'"'"'s/**'`));
  assert.ok(downloadCommand("box's", "win32").includes("'box''s/**'"));
  assert.ok(downloadCommand("box[1]*?", "darwin").includes("box[[]1[]][*][?]/**"));
});

test("file sizes include empty files and large assets", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(1024), "1 KB");
  assert.equal(formatBytes(1024 ** 3 * 1.5), "1.5 GB");
});

test("catalog follows every page, including empty intermediate pages, using only folder metadata", async (t) => {
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: string) => {
    calls.push(input);
    if (calls.length === 1)
      return Response.json([directory("appliance_a01")], {
        headers: { link: `<${TREE_API_URL}?cursor=2>; rel="next"` },
      });
    if (calls.length === 2) return Response.json([], { headers: { link: `<${TREE_API_URL}?cursor=3>; rel="next"` } });
    return Response.json([directory("appliance_a01"), directory("workstation_z01"), file("README.md")]);
  });
  const catalog = await getCatalog();
  assert.equal(calls.length, 3);
  assert.ok(calls.every((url) => url.startsWith(TREE_API_URL) && !url.includes("recursive=true")));
  assert.equal(catalog.length, 2);
  assert.equal(searchAssets(catalog, "workstation")[0]?.id, "workstation_z01");
});

test("pagination rejects external links and repeated cursors", async (t) => {
  assert.throws(() => nextPageUrl('<https://example.com/next>; rel="next"'), /invalid pagination/);
  assert.throws(
    () => nextPageUrl('<https://huggingface.co/api/models/other/tree/main>; rel="next"'),
    /invalid pagination/,
  );
  t.mock.method(globalThis, "fetch", async () =>
    Response.json([], { headers: { link: `<${TREE_API_URL}?cursor=loop>; rel="next"` } }),
  );
  await assert.rejects(listTree(), /repeated a page/);
});

test("failed later pages are not returned as a complete searchable catalog", async (t) => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => {
    requests++;
    return requests === 1
      ? Response.json([directory("appliance_a01")], { headers: { link: `<${TREE_API_URL}?cursor=2>; rel="next"` } })
      : new Response("unavailable", { status: 503 });
  });
  await assert.rejects(getCatalog(), /HTTP 503/);
});

test("invalid listings, unsafe paths, and rate limits surface actionable errors", async (t) => {
  const responses = [
    Response.json({ error: "bad response" }),
    Response.json([file("../escape.usd")]),
    new Response("rate limited", { status: 429 }),
  ];
  t.mock.method(globalThis, "fetch", async () => responses.shift()!);
  await assert.rejects(listTree(), /invalid file listing/);
  await assert.rejects(listTree(), /invalid file entry/);
  await assert.rejects(listTree(), /too many requests/);
  await assert.rejects(getAssetDetails("../escape"), /Invalid asset identifier/);
});

test("details fetch only the selected file index and small JSON metadata, never model or texture bodies", async (t) => {
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: string) => {
    calls.push(input);
    if (input.startsWith(TREE_API_URL))
      return Response.json([
        file(rootPath, 1_000_000),
        file(`${assetId}/simready_usd/Textures/color.png`, 9_000_000),
        file(rootsPath),
        file(packagingPath),
      ]);
    if (input === contentUrl(rootsPath)) return Response.json({ entries: [`simready_usd/sm_${assetId}_01.usd`] });
    if (input === contentUrl(packagingPath)) return Response.json({ license: "CC-BY-4.0" });
    throw new Error(`Unexpected content request: ${input}`);
  });
  const details = await getAssetDetails(assetId);
  assert.equal(calls.length, 3);
  assert.equal(details.models[0]?.path, rootPath);
  assert.equal(details.license, "CC-BY-4.0");
  assert.equal(details.totalSize, 10_000_200);
});

test("missing, malformed, failed, or oversized optional metadata does not hide files", async (t) => {
  t.mock.method(globalThis, "fetch", async (input: string) => {
    if (input.startsWith(TREE_API_URL))
      return Response.json([file(rootPath), file(rootsPath), file(packagingPath, 50_000)]);
    if (input === contentUrl(rootsPath)) return new Response("not JSON");
    throw new Error("Oversized metadata should not be requested");
  });
  const details = await getAssetDetails(assetId);
  assert.equal(details.models[0]?.path, rootPath);
  assert.equal(details.license, undefined);
  assert.equal(details.files.length, 3);
});

test("changing selection can cancel a request", async (t) => {
  const controller = new AbortController();
  controller.abort();
  t.mock.method(globalThis, "fetch", async (_input: string, init: RequestInit) => {
    init.signal?.throwIfAborted();
    return Response.json([]);
  });
  await assert.rejects(getCatalog(controller.signal), { name: "AbortError" });
});
