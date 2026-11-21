const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../src/tools/set-audio-device.ts"), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});

function loadTool(type, devices, switchError) {
  const calls = [];
  const exports = {};
  const switchDevice = async (id) => {
    calls.push(["switch", id]);
    if (switchError) throw switchError;
  };
  vm.runInNewContext(outputText, {
    exports,
    Date: { now: () => 1_000 },
    require: (name) => {
      if (name === "../audio-device") {
        return {
          getInputDevices: async () => devices,
          getOutputDevices: async () => devices,
          setDefaultInputDevice: type === "input" ? switchDevice : assert.fail,
        };
      }
      if (name === "../device-actions") {
        return { setOutputAndSystemDevice: type === "output" ? switchDevice : assert.fail };
      }
      assert.equal(name, "../device-preferences");
      return { setGraceUntil: async (...args) => calls.push(["grace", ...args]) };
    },
  });
  return { tool: () => exports.default({ type, deviceId: "device-1" }), calls };
}

for (const type of ["input", "output"]) {
  const devices = [{ id: "device-1", name: "Selected device" }];

  test(`${type}: successful AI switch starts a one-minute enforcement grace period`, async () => {
    const { tool, calls } = loadTool(type, devices);
    assert.equal(await tool(), `Active ${type} device set to Selected device.`);
    assert.deepEqual(calls, [
      ["switch", "device-1"],
      ["grace", type, 61_000],
    ]);
  });

  test(`${type}: failed switch does not start a grace period`, async () => {
    const error = new Error("Switch failed");
    const { tool, calls } = loadTool(type, devices, error);
    await assert.rejects(tool(), (actual) => actual === error);
    assert.deepEqual(calls, [["switch", "device-1"]]);
  });

  test(`${type}: unknown device does not switch or start a grace period`, async () => {
    const { tool, calls } = loadTool(type, []);
    await assert.rejects(tool(), new RegExp(`No ${type} device found`));
    assert.deepEqual(calls, []);
  });
}
