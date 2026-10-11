const test = require("node:test");
const assert = require("node:assert/strict");
const { loadSource, apiMock } = require("./helpers.cjs");
const favoritesKey = "network-service-favorites";
const orderKey = "network-service-favorites-order";
const metadataKey = "network-service-favorite-metadata";

test("unresolved numeric favorites and positions survive import without claiming a named service", async () => {
  const ctx = apiMock({ [favoritesKey]: '{"1":true}', [orderKey]: '{"1":4}' });
  const metadata = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
  for (let read = 0; read < 3; read++) {
    const result = await metadata.updateFavoriteMetadata();
    assert.deepEqual(result.favorites, { 1: true });
    assert.deepEqual(result.order, { 1: 4 });
  }
  assert.equal(ctx.storage.get(favoritesKey), '{"1":true}');
  assert.equal(ctx.storage.get(orderKey), '{"1":4}');
});

test("repair appends a favorite left without a position by an earlier partial save", async () => {
  const ctx = apiMock({
    [favoritesKey]: JSON.stringify({ "service:One": true, "service:Two": true, "service:Three": true }),
    [orderKey]: JSON.stringify({ "service:One": 0, "service:Two": 1 }),
  });
  const metadata = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
  const result = await metadata.updateFavoriteMetadata();
  assert.deepEqual(result.order, { "service:One": 0, "service:Two": 1, "service:Three": 2 });
});

test("a failed favorite save cannot commit membership without its position", async () => {
  const ctx = apiMock({
    [favoritesKey]: JSON.stringify({ "service:One": true, "service:Two": true }),
    [orderKey]: JSON.stringify({ "service:One": 0, "service:Two": 1 }),
  });
  const metadata = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
  await metadata.updateFavoriteMetadata();
  const original = ctx.api.LocalStorage.setItem;
  ctx.api.LocalStorage.setItem = async (key, value) => {
    if (key === orderKey || key === metadataKey) throw new Error("write failed");
    await original(key, value);
  };
  await assert.rejects(
    metadata.updateFavoriteMetadata(({ favorites, order }) => {
      favorites["service:Three"] = true;
      order["service:Three"] = 2;
    }),
    /write failed/,
  );
  ctx.api.LocalStorage.setItem = original;
  const result = await metadata.updateFavoriteMetadata();
  assert.deepEqual(result.favorites, { "service:One": true, "service:Two": true });
  assert.deepEqual(result.order, { "service:One": 0, "service:Two": 1 });
});

test("import preserves absent named favorites and unresolved numeric positions", async () => {
  const ctx = apiMock({
    [favoritesKey]: JSON.stringify({ 1: true, 9: true, "service:Offline": true, "service:Work": true }),
    [orderKey]: JSON.stringify({ 1: 3, 9: 8, "service:Offline": 5, "service:Work": 2 }),
  });
  const metadata = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
  const result = await metadata.updateFavoriteMetadata();
  assert.deepEqual(result.favorites, { 1: true, 9: true, "service:Offline": true, "service:Work": true });
  assert.deepEqual(result.order, { 1: 3, 9: 8, "service:Offline": 5, "service:Work": 2 });
  assert.deepEqual(await metadata.updateFavoriteMetadata(), result);
});

test("independent command modules serialize import and edits without losing either", async () => {
  const ctx = apiMock({
    [favoritesKey]: '{"1":true,"service:Work":true}',
    [orderKey]: '{"1":4,"service:Work":0}',
  });
  const first = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
  const second = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
  let releaseWrite, enteredWrite;
  const entered = new Promise((resolve) => {
    enteredWrite = resolve;
  });
  const original = ctx.api.LocalStorage.setItem;
  let writes = 0;
  ctx.api.LocalStorage.setItem = async (key, value) => {
    if (++writes === 1) {
      enteredWrite();
      await new Promise((resolve) => {
        releaseWrite = resolve;
      });
    }
    await original(key, value);
  };
  const migrating = first.updateFavoriteMetadata();
  await entered;
  let changed = false;
  const editing = second.updateFavoriteMetadata(({ favorites, order }) => {
    changed = true;
    delete favorites["service:Work"];
    delete order["service:Work"];
    favorites["service:Home"] = true;
    order["service:Home"] = 0;
  });
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(changed, false);
  releaseWrite();
  await Promise.all([migrating, editing]);
  assert.deepEqual(await first.loadFavorites(), { 1: true, "service:Home": true });
  assert.deepEqual(await first.loadFavoriteOrder(), { 1: 4, "service:Home": 0 });
});

test("metadata write errors are reported and release the lock for a retry", async () => {
  const ctx = apiMock({ [favoritesKey]: '{"1":true}' });
  const metadata = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
  const original = ctx.api.LocalStorage.setItem;
  ctx.api.LocalStorage.setItem = async () => {
    throw new Error("write failed");
  };
  await assert.rejects(metadata.updateFavoriteMetadata(), /write failed/);
  assert.equal(ctx.storage.has(metadataKey), false);
  assert.equal(ctx.storage.get(favoritesKey), '{"1":true}');
  ctx.api.LocalStorage.setItem = original;
  assert.equal((await metadata.updateFavoriteMetadata()).favorites[1], true);
});

test("repair preserves known manual order including absent services and appends all missing positions", async () => {
  const ctx = apiMock({
    [favoritesKey]: JSON.stringify({
      "service:New One": true,
      "service:One": true,
      "service:Two": true,
      "service:Absent": true,
      "service:New Two": true,
    }),
    [orderKey]: JSON.stringify({ "service:One": 8, "service:Two": 4, "service:Absent": 6 }),
  });
  const metadata = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
  const result = await metadata.updateFavoriteMetadata();
  assert.deepEqual(result.order, {
    "service:Two": 0,
    "service:Absent": 1,
    "service:One": 2,
    "service:New One": 3,
    "service:New Two": 4,
  });
  assert.deepEqual(await metadata.updateFavoriteMetadata(), result);
});

test("successful edits write one snapshot and later commands ignore stale split keys", async () => {
  const ctx = apiMock({ [favoritesKey]: '{"service:One":true}', [orderKey]: '{"service:One":0}' });
  const metadata = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
  await metadata.updateFavoriteMetadata();
  const writes = [];
  const original = ctx.api.LocalStorage.setItem;
  ctx.api.LocalStorage.setItem = async (key, value) => {
    writes.push(key);
    await original(key, value);
  };
  const result = await metadata.updateFavoriteMetadata(({ favorites, order }) => {
    delete favorites["service:One"];
    delete order["service:One"];
    favorites["service:Two"] = true;
    order["service:Two"] = 0;
  });
  assert.deepEqual(writes, [metadataKey]);
  assert.deepEqual(JSON.parse(ctx.storage.get(metadataKey)), result);
  const nextCommand = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
  assert.deepEqual(await nextCommand.loadFavorites(), { "service:Two": true });
  assert.deepEqual(await nextCommand.loadFavoriteOrder(), { "service:Two": 0 });
  assert.deepEqual(await nextCommand.updateFavoriteMetadata(), result);
  assert.deepEqual(writes, [metadataKey]);
});

for (const operation of ["remove", "move"]) {
  test(`a failed ${operation} leaves both saved favorites and order unchanged`, async () => {
    const ctx = apiMock({
      [favoritesKey]: '{"service:One":true,"service:Two":true}',
      [orderKey]: '{"service:One":0,"service:Two":1}',
    });
    const metadata = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
    const previous = await metadata.updateFavoriteMetadata();
    const original = ctx.api.LocalStorage.setItem;
    ctx.api.LocalStorage.setItem = async () => {
      throw new Error("write failed");
    };
    await assert.rejects(
      metadata.updateFavoriteMetadata(({ favorites, order }) => {
        if (operation === "remove") {
          delete favorites["service:One"];
          delete order["service:One"];
        } else {
          [order["service:One"], order["service:Two"]] = [order["service:Two"], order["service:One"]];
        }
      }),
      /write failed/,
    );
    ctx.api.LocalStorage.setItem = original;
    assert.deepEqual(await metadata.updateFavoriteMetadata(), previous);
  });
}

test("snapshot validation ignores invalid values without reviving stale legacy data", async () => {
  const ctx = apiMock({
    [favoritesKey]: '{"service:Removed":true}',
    [orderKey]: '{"service:Removed":0}',
    [metadataKey]: JSON.stringify({
      favorites: { "service:One": true, "service:Off": false, "service:Invalid": "true" },
      order: { "service:One": 3, "service:Negative": -1, "service:Invalid": "4" },
    }),
  });
  const metadata = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
  assert.deepEqual(await metadata.loadFavorites(), { "service:One": true, "service:Off": false });
  assert.deepEqual(await metadata.loadFavoriteOrder(), { "service:One": 3 });
  for (const raw of ["{broken", "[]", "null", "{}", '{"favorites":[],"order":null}']) {
    ctx.storage.set(metadataKey, raw);
    assert.deepEqual(await metadata.loadFavorites(), {});
    assert.deepEqual(await metadata.loadFavoriteOrder(), {});
  }
});
