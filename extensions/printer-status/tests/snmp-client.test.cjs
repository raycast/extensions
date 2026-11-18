const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

// Load the production client with an isolated SNMP transport for each test.
function loadModule(name, dependencies) {
  const source = fs.readFileSync(path.join(__dirname, "../src", `${name}.ts`), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require: (name) => dependencies[name] });
  return exports;
}

function setup(acceptedVersions, values = {}) {
  const constants = loadModule("constants", {});
  const oidValues = new Map(Object.entries(values).map(([key, value]) => [constants.DEFAULT_OIDS[key], value]));
  const sessions = [];
  const snmp = {
    Version1: 0,
    Version2c: 1,
    isVarbindError: (vb) => vb.type === "NoSuchInstance",
    createSession(host, community, options) {
      const session = {
        version: options.version,
        requests: [],
        closed: false,
        get(oids, callback) {
          assert.equal(this.closed, false);
          this.requests.push([...oids]);
          if (!acceptedVersions.includes(this.version)) {
            callback(new Error(`Version ${this.version} timed out`));
          } else if (oids[0] === constants.DEFAULT_OIDS.totalPagesOid) {
            callback(null, [{ oid: oids[0], value: 1234 }]);
          } else if (oidValues.has(oids[0])) {
            callback(null, [{ oid: oids[0], value: oidValues.get(oids[0]) }]);
          } else if (this.version === snmp.Version1) {
            callback(new Error("NoSuchName"));
          } else {
            callback(null, [{ oid: oids[0], type: "NoSuchInstance" }]);
          }
        },
        getNext(oids, callback) {
          assert.equal(this.closed, false);
          callback(null, []);
        },
        close() {
          assert.equal(this.closed, false);
          this.closed = true;
        },
      };
      sessions.push(session);
      return session;
    },
  };
  const { fetchPrinterStats } = loadModule("snmp-client", { "net-snmp": snmp, "./constants": constants });
  return { fetchPrinterStats, sessions };
}

for (const [label, supported, expected] of [
  ["v2c-only printer", [1], [1]],
  ["v1-only printer", [0], [1, 0]],
  ["dual-version printer", [0, 1], [1]],
]) {
  test(label, async () => {
    const { fetchPrinterStats, sessions } = setup(supported);
    const stats = await fetchPrinterStats("printer");
    assert.equal(stats.pageCount, "1234");
    assert.equal(stats.modelName, null);
    assert.equal(stats.displayMessages.length, 0);
    assert.deepEqual(sessions.map((session) => session.version), expected);
    assert.ok(sessions.every((session) => session.closed));
    if (expected.length === 2) assert.equal(sessions[0].requests.length, 1);
  });
}

test("both versions fail: reject and close both sessions", async () => {
  const { fetchPrinterStats, sessions } = setup([]);
  await assert.rejects(fetchPrinterStats("printer"), /Version 0 timed out/);
  assert.deepEqual(sessions.map((session) => session.version), [1, 0]);
  assert.ok(sessions.every((session) => session.closed && session.requests.length === 1));
});

for (const version of [0, 1]) {
  test(`missing display line preserves other stats under SNMP version ${version}`, async () => {
    const { fetchPrinterStats, sessions } = setup([version], {
      modelNameOid: "Xerox C325",
      displayMessage1Oid: "Ready",
      displayMessage3Oid: "Low toner",
    });
    const stats = await fetchPrinterStats("printer");
    assert.equal(stats.pageCount, "1234");
    assert.equal(stats.modelName, "Xerox C325");
    assert.deepEqual(Array.from(stats.displayMessages, ({ line, message }) => ({ line, message })), [
      { line: 1, message: "Ready" },
      { line: 3, message: "Low toner" },
    ]);
    assert.ok(sessions.every((session) => session.requests.every((oids) => oids.length === 1)));
  });
}

for (const [level, capacity, expected] of [
  [80, -2, null],
  [800, 1000, "20% used"],
  [84, 100, "16% used"],
  [-2, 100, null],
  [80, 0, null],
  [80, undefined, null],
  [80, Infinity, null],
  [80, "100invalid", null],
]) {
  test(`waste level ${level}, capacity ${capacity}: ${expected}`, async () => {
    const { fetchPrinterStats } = setup([1], {
      wasteTonerBottleOid: level,
      wasteTonerBottleMaxCapacityOid: capacity,
    });
    const stats = await fetchPrinterStats("printer");
    assert.equal(stats.wasteTonerBottle, expected);
  });
}
