const test = require("node:test");
const assert = require("node:assert/strict");
const { loadSource, apiMock } = require("./helpers.cjs");
const favoritesKey = "network-service-favorites";
const orderKey = "network-service-favorites-order";

test("migration preserves missing stable and legacy favorites and their relative positions", async () => {
  const ctx = apiMock({
    [favoritesKey]: JSON.stringify({ 1: true, 9: true, "service:Offline": true }),
    [orderKey]: JSON.stringify({ 1: 3, 9: 8, "service:Offline": 5 }),
  });
  const metadata = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
  let result = await metadata.updateFavoriteMetadata([{ id: "service:Work", legacyId: "1" }]);
  assert.deepEqual(result.favorites, { "service:Work": true, 9: true, "service:Offline": true });
  assert.deepEqual(result.order, { "service:Work": 0, "service:Offline": 1, 9: 2 });
  result = await metadata.updateFavoriteMetadata([{ id: "service:Returning", legacyId: "9" }]);
  assert.equal(result.favorites["service:Returning"], true);
  assert.equal(result.order["service:Returning"], 2);
  assert.equal(result.favorites["service:Offline"], true);
  assert.equal(result.order["service:Offline"], 1);
});

test("independent command modules serialize migration and edits without losing either", async () => {
  const ctx = apiMock({ [favoritesKey]: '{"1":true}', [orderKey]: '{"1":0}' });
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
  const services = [{ id: "service:Work", legacyId: "1" }];
  const migrating = first.updateFavoriteMetadata(services);
  await entered;
  let changed = false;
  const editing = second.updateFavoriteMetadata(services, ({ favorites, order }) => {
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
  assert.deepEqual(await first.loadFavorites(), { "service:Home": true });
  assert.deepEqual(await first.loadFavoriteOrder(), { "service:Home": 0 });
});

test("metadata write errors are reported and release the lock for a retry", async () => {
  const ctx = apiMock({ [favoritesKey]: '{"1":true}' });
  const metadata = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
  const original = ctx.api.LocalStorage.setItem;
  ctx.api.LocalStorage.setItem = async () => {
    throw new Error("write failed");
  };
  await assert.rejects(metadata.updateFavoriteMetadata([{ id: "service:Work", legacyId: "1" }]), /write failed/);
  ctx.api.LocalStorage.setItem = original;
  assert.equal(
    (await metadata.updateFavoriteMetadata([{ id: "service:Work", legacyId: "1" }])).favorites["service:Work"],
    true,
  );
});
