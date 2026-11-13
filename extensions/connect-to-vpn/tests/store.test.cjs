const test = require("node:test");
const assert = require("node:assert/strict");
const { loadSource, apiMock } = require("./helpers.cjs");
const update = { serviceId: "service:Work VPN", status: "connecting", timestamp: 123 };

test("menu bar status updates do not signal or launch themselves", async () => {
  const ctx = apiMock();
  ctx.api.environment.entryPointName = "menu-bar";
  const store = loadSource("store.ts", { "@raycast/api": ctx.api });
  await store.updateVpnStatus(update);
  assert.equal(ctx.launches.length, 0);
  assert.equal(ctx.storage.has("vpn-menubar-refresh-timestamp"), false);
  assert.deepEqual(await store.getVpnStatus(), update);
});

test("sharing failures cannot turn a successful VPN request into a reported failure", async () => {
  const ctx = apiMock();
  ctx.api.LocalStorage.setItem = async () => {
    throw new Error("storage unavailable");
  };
  const store = loadSource("store.ts", { "@raycast/api": ctx.api });
  await assert.doesNotReject(store.updateVpnStatus(update));
});

test("malformed shared status and timestamps are ignored", async () => {
  const ctx = apiMock({
    "vpn-connection-status": '{"serviceId":"vpn","status":"unknown","timestamp":1}',
    "vpn-menubar-refresh-timestamp": "invalid",
  });
  const store = loadSource("store.ts", { "@raycast/api": ctx.api });
  assert.equal(await store.getVpnStatus(), null);
  assert.equal(await store.getMenuBarRefreshTimestamp(), 0);
  ctx.storage.set("vpn-connection-status", "{broken");
  assert.equal(await store.getVpnStatus(), null);
});
