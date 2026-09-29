const test = require("node:test");
const assert = require("node:assert/strict");
const { loadSource, apiMock, service } = require("./helpers.cjs");

const LAST_USED_KEY = "network-service-last-used";
function setup(lastUsed, services = [service()]) {
  const context = apiMock(lastUsed === undefined ? {} : { [LAST_USED_KEY]: lastUsed });
  const requests = [];
  let discoveries = 0;
  const network = {
    LAST_USED_KEY,
    getNetworkServices: async () => {
      discoveries++;
      return Object.fromEntries(services.map((s) => [s.id, s]));
    },
    setServiceStatus: async (s, status) => {
      requests.push([s, status]);
    },
    isSessionGone: (err) => err instanceof Error && err.message === "Worker unloaded",
  };
  const command = loadSource("toggle.ts", { "@raycast/api": context.api, "./network-services": network }).default;
  return {
    ...context,
    requests,
    network,
    command,
    get discoveries() {
      return discoveries;
    },
  };
}

test("first-use shortcut gives setup guidance without reading or changing networks", async () => {
  const ctx = setup();
  await ctx.command();
  assert.match(ctx.hud[0], /Show Network Services/);
  assert.doesNotMatch(ctx.hud[0], /undefined/);
  assert.equal(ctx.discoveries, 0);
  assert.equal(ctx.requests.length, 0);
});

test("removed or renamed VPN gives guidance and does not toggle another service", async () => {
  const ctx = setup("Old VPN");
  await ctx.command();
  assert.match(ctx.hud[0], /was not found/);
  assert.equal(ctx.requests.length, 0);
});

for (const status of ["invalid", "connecting", "disconnecting"]) {
  test(`shortcut refuses to toggle a service that is ${status}`, async () => {
    const ctx = setup("Work VPN", [service({ status })]);
    await ctx.command();
    assert.equal(ctx.requests.length, 0);
    assert.match(ctx.hud[0], status === "invalid" ? /unavailable/ : /already/);
  });
}

for (const [before, after, feedback] of [
  ["connected", "disconnecting", /Disconnecting from/],
  ["disconnected", "connecting", /Connecting to/],
]) {
  test(`shortcut requests ${after} before displaying any HUD`, async () => {
    const name = 'Work "London" VPN';
    const ctx = setup(name, [service({ name, status: before })]);
    ctx.network.setServiceStatus = async (s, status) => {
      assert.equal(ctx.hud.length, 0);
      ctx.requests.push([s, status]);
    };
    await ctx.command();
    assert.equal(ctx.requests[0][0].name, name);
    assert.equal(ctx.requests[0][1], after);
    assert.match(ctx.hud[0], feedback);
    assert.doesNotMatch(ctx.hud[0], /Turned/);
  });
}

test("storage and network errors are visible through the shortcut HUD", async () => {
  const ctx = setup("Work VPN");
  ctx.api.LocalStorage.getItem = async () => {
    throw new Error("storage unavailable");
  };
  await ctx.command();
  assert.match(ctx.hud[0], /storage unavailable/);
  const failed = setup("Work VPN");
  failed.network.setServiceStatus = async () => {
    throw new Error("connection rejected");
  };
  await failed.command();
  assert.match(failed.hud[0], /connection rejected/);
});
