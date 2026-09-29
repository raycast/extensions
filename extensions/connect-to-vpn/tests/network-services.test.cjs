const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { create, act } = require("react-test-renderer");
const { loadSource, apiMock, service, serviceOrder, vpnList } = require("./helpers.cjs");
global.IS_REACT_ACT_ENVIRONMENT = true;

function setup(initial = {}) {
  const context = apiMock(initial);
  const calls = [];
  const output = {
    order: serviceOrder([[1, "Work VPN"]]),
    statuses: vpnList([["Work VPN"]]),
    failure: undefined,
    onRead: undefined,
    onMutation: undefined,
  };
  const execFile = (file, args, options, callback) => {
    calls.push({ file, args, options });
    if (args[0] === "-listnetworkserviceorder") return callback(null, output.order);
    if (args[0] === "--nc") {
      if (output.onRead) return output.onRead(callback);
      return callback(null, output.statuses);
    }
    if (args[0] === "-showpppoestatus") return callback(null, "not a VPN");
    if (output.onMutation) return output.onMutation(callback);
    callback(output.failure, "");
  };
  const mocks = { "@raycast/api": context.api, child_process: { execFile } };
  const network = loadSource("network-services.ts", mocks);
  return { ...context, network, calls, output, mocks };
}

async function mount(ctx, t) {
  let current, renderer;
  function Component() {
    current = ctx.network.useNetworkServices();
    return null;
  }
  await act(async () => {
    renderer = create(React.createElement(Component));
  });
  t.after(async () => {
    await act(async () => {
      renderer.unmount();
    });
  });
  return () => current;
}

test("discovers disabled VPNs, quoted names and physical interfaces with one batched VPN read", async () => {
  const ctx = setup();
  const quoted = 'Work "London" VPN';
  ctx.output.order = serviceOrder([
    [1, quoted],
    ["*", "Disabled VPN"],
    [2, "Wi-Fi", "Wi-Fi", "en0"],
  ]);
  ctx.output.statuses = vpnList([[quoted, "Connected"]]);
  const services = await ctx.network.getNetworkServices({}, {});
  assert.equal(services[`service:${quoted}`].status, "connected");
  assert.equal(services["service:Disabled VPN"].status, "invalid");
  assert.equal(services["service:Wi-Fi"].status, "invalid");
  assert.equal(ctx.calls.length, 2);
});

test("migrates numeric favorites once and preserves identity after network reordering", async () => {
  const ctx = setup();
  ctx.output.order = serviceOrder([
    [1, "Work VPN"],
    [2, "Home VPN"],
  ]);
  ctx.output.statuses = vpnList([["Work VPN"], ["Home VPN"]]);
  await ctx.network.getNetworkServices({ 1: true }, { 1: 4 });
  const favs = await ctx.network.loadFavorites();
  const order = await ctx.network.loadFavoriteOrder();
  assert.deepEqual(favs, { "service:Work VPN": true });
  assert.deepEqual(order, { "service:Work VPN": 4 });
  ctx.output.order = serviceOrder([
    [1, "Home VPN"],
    [2, "Work VPN"],
  ]);
  const services = await ctx.network.getNetworkServices(favs, order);
  assert.equal(services["service:Work VPN"].favorite, true);
  assert.equal(services["service:Home VPN"].favorite, false);
});

test("unsupported fallback status is invalid rather than connectable", async () => {
  const ctx = setup();
  ctx.output.statuses = "";
  const services = await ctx.network.getNetworkServices({}, {});
  assert.equal(services["service:Work VPN"].status, "invalid");
  assert.deepEqual(ctx.calls[2].args, ["-showpppoestatus", "Work VPN"]);
});

test("failed request restores state and preserves the original error when status recovery also fails", async () => {
  const ctx = setup();
  ctx.output.failure = new Error("connection rejected");
  ctx.output.onRead = (callback) => callback(new Error("status unavailable"));
  const changes = [];
  await assert.rejects(
    ctx.network.setServiceStatus(service(), "connecting", (state) => changes.push(state)),
    /connection rejected/,
  );
  assert.deepEqual(changes, ["connecting", "disconnected"]);
  assert.equal(ctx.storage.has(ctx.network.LAST_USED_KEY), false);
});

test("successful request passes names as a single argument and remembers their raw spelling", async () => {
  const ctx = setup();
  const name = 'Work "London" $(literal) VPN';
  await ctx.network.setServiceStatus(service({ name }), "connecting");
  assert.deepEqual(ctx.calls[0].args, ["-connectpppoeservice", name]);
  assert.equal(ctx.storage.get(ctx.network.LAST_USED_KEY), name);
  assert.equal(ctx.launches.length, 1);
});

test("metadata rejects malformed JSON and invalid values without preventing service discovery", async () => {
  const ctx = setup({
    "network-service-favorites": "{broken",
    "network-service-favorites-order": '{"good":3,"bad":"4","negative":-1}',
  });
  assert.deepEqual(await ctx.network.loadFavorites(), {});
  assert.deepEqual(await ctx.network.loadFavoriteOrder(), { good: 3 });
  ctx.storage.set("network-service-favorites", '{"good":true,"bad":"true"}');
  assert.deepEqual(await ctx.network.loadFavorites(), { good: true });
});

test("manual favorite ordering wins over connected status and duplicate type labels are hidden", () => {
  const ctx = setup();
  const sorted = ctx.network.sortNetworkServices(
    [
      service({ name: "Second", status: "connected", favorite: true, order: 1 }),
      service({ name: "First", favorite: true, order: 0 }),
    ],
    "ascService",
  );
  assert.deepEqual(
    sorted.map((s) => s.name),
    ["First", "Second"],
  );
  assert.equal(ctx.network.normalizeHardwarePort("Work VPN", "Work VPN"), "");
  assert.equal(ctx.network.normalizeHardwarePort("com.wireguard.macos", "Home"), "WireGuard");
});

test("refresh rediscovers added and removed VPNs without launching the menu bar", async (t) => {
  const ctx = setup();
  const current = await mount(ctx, t);
  assert.equal(ctx.calls.length, 2);
  ctx.output.order = serviceOrder([[2, "Home VPN"]]);
  ctx.output.statuses = vpnList([["Home VPN", "Connected"]]);
  await act(async () => {
    await current().refreshServices();
  });
  assert.deepEqual(
    current().otherServices.map((s) => s.name),
    ["Home VPN"],
  );
  assert.equal(ctx.calls.length, 4);
  assert.equal(ctx.launches.length, 0);
});

test("storage failure stops loading and refresh recovers", async (t) => {
  const ctx = setup();
  const getItem = ctx.api.LocalStorage.getItem;
  ctx.api.LocalStorage.getItem = async () => {
    throw new Error("read failed");
  };
  const current = await mount(ctx, t);
  assert.equal(current().isLoading, false);
  assert.match(current().error.message, /read failed/);
  ctx.api.LocalStorage.getItem = getItem;
  await act(async () => {
    await current().refreshServices();
  });
  assert.equal(current().error, undefined);
  assert.equal(current().otherServices.length, 1);
});

test("favorites respect the non-VPN filter and never appear in two sections", async (t) => {
  const ctx = setup({ "network-service-favorites": '{"service:Disabled VPN":true}' });
  ctx.output.order = serviceOrder([["*", "Disabled VPN"]]);
  ctx.output.statuses = "";
  let hide = true;
  ctx.api.getPreferenceValues = () => ({ hideInvalidDevices: hide, sortBy: "ascService" });
  const current = await mount(ctx, t);
  assert.equal(current().favoriteServices.length, 0);
  hide = false;
  await act(async () => {
    await current().refreshServices();
  });
  assert.equal(current().favoriteServices.length, 1);
  assert.equal(current().invalidServices.length, 0);
});

test("adding after favorite deletion uses a unique order and preserves manual movement", async (t) => {
  const ctx = setup({
    "network-service-favorites": '{"service:One":true,"service:Three":true}',
    "network-service-favorites-order": '{"service:One":0,"service:Three":2}',
  });
  ctx.output.order = serviceOrder([
    [1, "One"],
    [2, "Two"],
    [3, "Three"],
  ]);
  ctx.output.statuses = vpnList([["One"], ["Two"], ["Three", "Connected"]]);
  const current = await mount(ctx, t);
  await act(async () => {
    await current().addToFavorites(current().otherServices[0]);
  });
  assert.deepEqual(
    current().favoriteServices.map((s) => s.name),
    ["One", "Three", "Two"],
  );
  assert.deepEqual(
    current().favoriteServices.map((s) => s.order),
    [0, 2, 3],
  );
  await act(async () => {
    await current().moveFavoriteUp(current().favoriteServices[2]);
  });
  assert.deepEqual(
    current().favoriteServices.map((s) => s.name),
    ["One", "Two", "Three"],
  );
  await act(async () => {
    await current().moveFavoriteDown(current().favoriteServices[1]);
  });
  assert.deepEqual(
    current().favoriteServices.map((s) => s.name),
    ["One", "Three", "Two"],
  );
  const savedOrder = await ctx.network.loadFavoriteOrder();
  assert.deepEqual(savedOrder, { "service:One": 0, "service:Three": 2, "service:Two": 3 });
  await act(async () => {
    await current().moveFavoriteUp(current().favoriteServices[0]);
    await current().moveFavoriteDown(current().favoriteServices[2]);
    await current().moveFavoriteDown(service({ id: "service:Missing" }));
  });
  assert.deepEqual(await ctx.network.loadFavoriteOrder(), savedOrder);
  assert.deepEqual(
    current().favoriteServices.map((s) => s.name),
    ["One", "Three", "Two"],
  );
});

test("transition reads wait for the mutation and retry after a transient read failure", async (t) => {
  const ctx = setup();
  const current = await mount(ctx, t);
  let finish, action;
  ctx.output.onMutation = (callback) => {
    finish = callback;
  };
  await act(async () => {
    action = current().getActionForService(current().otherServices[0]).action();
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
  assert.equal(ctx.calls.filter((call) => call.args[0] === "--nc").length, 1);
  let reads = 0;
  ctx.output.onRead = (callback) => {
    if (++reads === 1) callback(new Error("temporary read failure"));
    else callback(null, vpnList([["Work VPN", "Connected"]]));
  };
  await act(async () => {
    finish(null, "");
    await action;
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
  assert.equal(current().otherServices[0].status, "connected");
  assert.equal(reads, 2);
});

test("late refresh cannot overwrite a newer favorite edit", async (t) => {
  const ctx = setup();
  const current = await mount(ctx, t);
  let finish, refresh;
  ctx.output.onRead = (callback) => {
    finish = callback;
  };
  await act(async () => {
    refresh = current().refreshServices();
  });
  await act(async () => {
    await current().addToFavorites(current().otherServices[0]);
  });
  await act(async () => {
    finish(null, ctx.output.statuses);
    await refresh;
  });
  assert.equal(current().favoriteServices.length, 1);
  assert.equal(current().otherServices.length, 0);
});

test("recent cross-command transition survives the first stale macOS status read", async (t) => {
  const ctx = setup({
    "vpn-connection-status": JSON.stringify({
      serviceId: "service:Work VPN",
      status: "connecting",
      timestamp: Date.now(),
    }),
  });
  const current = await mount(ctx, t);
  assert.equal(current().otherServices[0].status, "connecting");
});

test("background menu bar loads once, uses an adaptive icon, and refreshes on signals without echoing", async (t) => {
  const ctx = setup();
  ctx.api.environment = { entryPointName: "menu-bar", launchType: "background" };
  ctx.api.Color = { PrimaryText: "primary-text" };
  ctx.api.MenuBarExtra = Object.assign((props) => React.createElement("menu", props), {
    Item: "item",
    Section: "section",
  });
  const Command = loadSource("menu-bar.tsx", ctx.mocks).default;
  let renderer;
  await act(async () => {
    renderer = create(React.createElement(Command));
  });
  t.after(async () => {
    await act(async () => {
      renderer.unmount();
    });
  });
  assert.equal(ctx.calls.length, 2);
  assert.deepEqual(renderer.root.findByType("menu").props.icon, {
    source: "network-disconnected.png",
    tintColor: "primary-text",
  });
  assert.equal(renderer.root.findByType("menu").props.tooltip, "No VPN connected");
  ctx.output.statuses = vpnList([["Work VPN", "Connected"]]);
  ctx.storage.set("vpn-menubar-refresh-timestamp", "1");
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 550));
  });
  assert.equal(ctx.calls.length, 4);
  assert.equal(renderer.root.findByType("menu").props.icon.source, "network-connected.png");
  assert.equal(renderer.root.findByType("menu").props.tooltip, "Connected to Work VPN");
  assert.equal(ctx.launches.length, 0);
});
