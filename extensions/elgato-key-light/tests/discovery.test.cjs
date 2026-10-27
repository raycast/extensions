const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { readFileSync } = require("node:fs");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const source = ts.transpileModule(readFileSync(`${__dirname}/../src/elgato.ts`, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

function network(address, family = "IPv4", internal = false) {
  return { address, family, internal };
}

function light(name = "Test light", address = "192.168.1.50") {
  return {
    name,
    addresses: [address],
    referer: { address },
    port: 9123,
  };
}

// Run the production class with isolated network, timer, cache and Raycast boundaries.
function setup(interfaces, { failOnFind = -1 } = {}) {
  const clients = [];
  const timers = new Set();
  const cache = new Map();
  class Bonjour {
    constructor(options) {
      this.options = options;
      this.destroyed = false;
      clients.push(this);
    }
    find(query, onService) {
      assert.equal(query.type, "elg");
      if (clients.length - 1 === failOnFind) throw new Error("Cannot start browser");
      this.onService = onService;
      this.browser = new EventEmitter();
      this.browser.stop = () => {
        this.stopped = true;
      };
      return this.browser;
    }
    destroy() {
      this.destroyed = true;
    }
  }
  class Cache {
    get(key) {
      return cache.get(key);
    }
    set(key, value) {
      cache.set(key, value);
    }
    remove(key) {
      cache.delete(key);
    }
  }
  const dependencies = {
    "node:os": { networkInterfaces: () => interfaces },
    "bonjour-service": Bonjour,
    axios: { get: async () => ({ data: {} }) },
    "@raycast/api": {
      environment: { isDevelopment: false },
      Cache,
      showToast: async () => {},
      Toast: { Style: { Animated: "animated", Success: "success" } },
    },
    "@raycast/utils": { showFailureToast: () => {} },
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    setTimeout: (callback) => {
      timers.add(callback);
      return callback;
    },
    clearTimeout: (callback) => timers.delete(callback),
  });
  return {
    KeyLight: exports.KeyLight,
    clients,
    timers,
    finish: () => [...timers].forEach((callback) => callback()),
  };
}

function assertClosed(run) {
  assert.equal(run.timers.size, 0);
  for (const client of run.clients) {
    assert.equal(client.destroyed, true);
    if (client.browser) assert.equal(client.stopped, true);
  }
}

for (const [name, interfaces] of [
  ["Wi-Fi", { en0: [network("192.168.1.2")] }],
  ["Ethernet", { en8: [network("10.0.0.2")] }],
]) {
  test(`discovers lights with only ${name} connected`, async () => {
    const run = setup(interfaces);
    const discovery = run.KeyLight.discover(true);
    await new Promise(setImmediate);
    assert.equal(run.clients.length, 1);
    run.clients[0].onService(light());
    run.finish();
    assert.equal((await discovery).service.name, "Test light");
    assertClosed(run);
  });
}

test("queries Wi-Fi alongside Ethernet and VPN, ignores loopback/IPv6 and deduplicates lights", async () => {
  const run = setup({
    en8: [network("10.0.0.2")],
    en0: [network("fe80::1", "IPv6"), network("192.168.1.2"), network("192.168.1.2")],
    utun4: [network("10.10.0.2")],
    lo0: [network("127.0.0.1", "IPv4", true)],
    inactive: undefined,
  });
  const discovery = run.KeyLight.discover(true);
  await new Promise(setImmediate);
  assert.equal(run.clients.length, 3);
  assert.deepEqual(
    run.clients.map((client) => client.options.interface),
    ["10.0.0.2", "192.168.1.2", "10.10.0.2"],
  );
  for (const client of run.clients) {
    assert.equal(client.options.bind, "0.0.0.0");
    assert.equal(client.options.port, 5353);
  }
  run.clients[1].onService(light());
  run.clients[0].onService(light());
  run.clients[1].onService(light("Second light", "192.168.1.51"));
  run.finish();
  await discovery;
  assert.equal(run.KeyLight.getDiscoveredLights().length, 2);
  assertClosed(run);
  await run.KeyLight.discover();
  assert.equal(run.clients.length, 3, "cached discovery should not open sockets");
});

test("closes all browsers and sockets when discovery times out, and supports retry", async () => {
  const run = setup({ en8: [network("10.0.0.2")], en0: [network("192.168.1.2")] });
  const discovery = run.KeyLight.discover(true);
  await new Promise(setImmediate);
  run.finish();
  await assert.rejects(discovery, /Cannot discover/);
  assertClosed(run);
  const retry = run.KeyLight.discover(true);
  await new Promise(setImmediate);
  run.clients[3].onService(light());
  run.finish();
  await retry;
  assertClosed(run);
});

test("closes already-created clients if starting a browser fails", async () => {
  const run = setup({ en8: [network("10.0.0.2")], en0: [network("192.168.1.2")] }, { failOnFind: 1 });
  await assert.rejects(run.KeyLight.discover(true), /Cannot start browser/);
  assertClosed(run);
});

test("reports no lights when there are no connected IPv4 interfaces", async () => {
  const run = setup({ lo0: [network("127.0.0.1", "IPv4", true)] });
  const discovery = run.KeyLight.discover(true);
  await new Promise(setImmediate);
  assert.equal(run.clients.length, 0);
  run.finish();
  await assert.rejects(discovery, /Cannot discover/);
  assertClosed(run);
});
