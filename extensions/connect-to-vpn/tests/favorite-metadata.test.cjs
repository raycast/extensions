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
    const result = await metadata.readFavoriteMetadata();
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
  const result = await metadata.readFavoriteMetadata();
  assert.deepEqual(result.order, { "service:One": 0, "service:Two": 1, "service:Three": 2 });
});

test("a failed favorite save cannot commit membership without its position", async () => {
  const ctx = apiMock({
    [favoritesKey]: JSON.stringify({ "service:One": true, "service:Two": true }),
    [orderKey]: JSON.stringify({ "service:One": 0, "service:Two": 1 }),
  });
  const metadata = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
  await metadata.readFavoriteMetadata();
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
  const result = await metadata.readFavoriteMetadata();
  assert.deepEqual(result.favorites, { "service:One": true, "service:Two": true });
  assert.deepEqual(result.order, { "service:One": 0, "service:Two": 1 });
});

test("import preserves absent named favorites and unresolved numeric positions", async () => {
  const ctx = apiMock({
    [favoritesKey]: JSON.stringify({ 1: true, 9: true, "service:Offline": true, "service:Work": true }),
    [orderKey]: JSON.stringify({ 1: 3, 9: 8, "service:Offline": 5, "service:Work": 2 }),
  });
  const metadata = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
  const result = await metadata.readFavoriteMetadata();
  assert.deepEqual(result.favorites, { 1: true, 9: true, "service:Offline": true, "service:Work": true });
  assert.deepEqual(result.order, { 1: 3, 9: 8, "service:Offline": 5, "service:Work": 2 });
  assert.deepEqual(await metadata.readFavoriteMetadata(), result);
});

test("pure reads repair legacy positions without saving even when writes fail", async () => {
  const ctx = apiMock({
    [favoritesKey]: '{"service:Work":true,"service:Home":true}',
    [orderKey]: '{"service:Home":0}',
  });
  let writes = 0;
  ctx.api.LocalStorage.setItem = async () => {
    writes++;
    throw new Error("write failed");
  };
  const metadata = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
  assert.deepEqual((await metadata.readFavoriteMetadata()).order, { "service:Home": 0, "service:Work": 1 });
  assert.deepEqual((await metadata.readFavoriteMetadata()).order, { "service:Home": 0, "service:Work": 1 });
  assert.equal(writes, 0);
  assert.equal(ctx.storage.has(metadataKey), false);
  assert.equal(ctx.storage.get(orderKey), '{"service:Home":0}');
});

test("independent workers serialize overlapping edits while readers do not wait or write", async () => {
  const ctx = apiMock({ [favoritesKey]: '{"service:Work":true}', [orderKey]: '{"service:Work":0}' });
  const metadata = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
  const reader = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
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
  const first = metadata.updateFavoriteMetadata(({ favorites, order }) => {
    favorites["service:Home"] = true;
    order["service:Home"] = 1;
  });
  await entered;
  let changed = false;
  const second = reader.updateFavoriteMetadata(({ favorites, order }) => {
    changed = true;
    delete favorites["service:Work"];
    delete order["service:Work"];
  });
  assert.deepEqual((await reader.readFavoriteMetadata()).favorites, { "service:Work": true });
  await new Promise((resolve) => setTimeout(resolve, 40));
  assert.equal(changed, false);
  assert.equal(writes, 1);
  releaseWrite();
  await Promise.all([first, second]);
  assert.deepEqual(await reader.loadFavorites(), { "service:Home": true });
  assert.deepEqual(await reader.loadFavoriteOrder(), { "service:Home": 1 });
});

test("a failed edit leaves legacy data intact and the next queued edit can succeed", async () => {
  const ctx = apiMock({ [favoritesKey]: '{"1":true}' });
  const metadata = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
  const original = ctx.api.LocalStorage.setItem;
  ctx.api.LocalStorage.setItem = async () => {
    throw new Error("write failed");
  };
  const addHome = ({ favorites, order }) => {
    favorites["service:Home"] = true;
    order["service:Home"] = 0;
  };
  await assert.rejects(metadata.updateFavoriteMetadata(addHome), /write failed/);
  assert.equal(ctx.storage.has(metadataKey), false);
  assert.equal(ctx.storage.get(favoritesKey), '{"1":true}');
  ctx.api.LocalStorage.setItem = original;
  await metadata.updateFavoriteMetadata(addHome);
  assert.deepEqual(await metadata.loadFavorites(), { 1: true, "service:Home": true });
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
  const result = await metadata.readFavoriteMetadata();
  assert.deepEqual(result.order, {
    "service:Two": 0,
    "service:Absent": 1,
    "service:One": 2,
    "service:New One": 3,
    "service:New Two": 4,
  });
  assert.deepEqual(await metadata.readFavoriteMetadata(), result);
});

test("successful edits write one snapshot and later commands ignore stale split keys", async () => {
  const ctx = apiMock({ [favoritesKey]: '{"service:One":true}', [orderKey]: '{"service:One":0}' });
  const metadata = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
  await metadata.readFavoriteMetadata();
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
  assert.deepEqual(await nextCommand.readFavoriteMetadata(), result);
  assert.deepEqual(writes, [metadataKey]);
});

for (const operation of ["remove", "move"]) {
  test(`a failed ${operation} leaves both saved favorites and order unchanged`, async () => {
    const ctx = apiMock({
      [favoritesKey]: '{"service:One":true,"service:Two":true}',
      [orderKey]: '{"service:One":0,"service:Two":1}',
    });
    const metadata = loadSource("favorite-metadata.ts", { "@raycast/api": ctx.api });
    const previous = await metadata.readFavoriteMetadata();
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
    assert.deepEqual(await metadata.readFavoriteMetadata(), previous);
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

test("writer lock failure is reported without blocking pure reads or changing saved data", async () => {
  const ctx = apiMock({ [favoritesKey]: '{"service:Work":true}' });
  let attempts = 0;
  const metadata = loadSource("favorite-metadata.ts", {
    "@raycast/api": ctx.api,
    "proper-lockfile": {
      lock: async () => {
        attempts++;
        throw new Error("lock unavailable");
      },
    },
  });
  assert.deepEqual((await metadata.readFavoriteMetadata()).favorites, { "service:Work": true });
  assert.equal(attempts, 0);
  await assert.rejects(
    metadata.updateFavoriteMetadata(({ favorites }) => {
      favorites["service:Home"] = true;
    }),
    /lock unavailable/,
  );
  assert.deepEqual((await metadata.readFavoriteMetadata()).favorites, { "service:Work": true });
  assert.equal(attempts, 1);
  assert.equal(ctx.storage.has(metadataKey), false);
});

for (const saveFails of [false, true]) {
  test(`lock cleanup failure preserves the ${saveFails ? "original save error" : "committed edit result"}`, async () => {
    const ctx = apiMock({ [favoritesKey]: '{"service:Work":true}' });
    const metadata = loadSource("favorite-metadata.ts", {
      "@raycast/api": ctx.api,
      "proper-lockfile": {
        lock: async () => async () => {
          throw new Error("cleanup failed");
        },
      },
    });
    if (saveFails)
      ctx.api.LocalStorage.setItem = async () => {
        throw new Error("save failed");
      };
    const edit = metadata.updateFavoriteMetadata(({ favorites, order }) => {
      favorites["service:Home"] = true;
      order["service:Home"] = 1;
    });
    if (saveFails) {
      await assert.rejects(edit, /save failed/);
      assert.equal(ctx.storage.has(metadataKey), false);
    } else {
      const result = await edit;
      assert.deepEqual(JSON.parse(ctx.storage.get(metadataKey)), result);
      assert.equal(result.favorites["service:Home"], true);
    }
  });
}
