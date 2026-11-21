const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../src/tools/list-audio-devices.ts"), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});

function loadTool(type, getDevices, getDefaultDevice) {
  const exports = {};
  const suffix = type === "input" ? "Input" : "Output";
  vm.runInNewContext(outputText, {
    exports,
    Error,
    require: (name) => {
      assert.equal(name, "../audio-device");
      return {
        [`get${suffix}Devices`]: getDevices,
        [`getDefault${suffix}Device`]: getDefaultDevice,
      };
    },
  });
  return async () => JSON.parse(JSON.stringify(await exports.default({ type })));
}

for (const type of ["input", "output"]) {
  const devices = [
    { id: "device-1", name: "First device" },
    { id: "device-2", name: "Second device" },
  ];
  const inactive = devices.map((device) => ({ ...device, isDefault: false }));
  const noDefault = async () => {
    throw new Error(`No default ${type} device found`);
  };

  test(`${type}: lists devices when no default exists`, async () => {
    const tool = loadTool(type, async () => devices, noDefault);
    assert.deepEqual(await tool(), inactive);
  });

  test(`${type}: returns an empty list when no devices exist`, async () => {
    const tool = loadTool(type, async () => [], noDefault);
    assert.deepEqual(await tool(), []);
  });

  test(`${type}: identifies the active device`, async () => {
    const tool = loadTool(
      type,
      async () => devices,
      async () => devices[1],
    );
    assert.deepEqual(await tool(), [inactive[0], { ...inactive[1], isDefault: true }]);
  });

  test(`${type}: propagates enumeration errors`, async () => {
    const error = new Error("Device enumeration failed");
    const tool = loadTool(type, async () => Promise.reject(error), noDefault);
    await assert.rejects(tool(), (actual) => actual === error);
  });

  test(`${type}: propagates unexpected default lookup errors`, async () => {
    const error = new Error("Audio backend unavailable");
    const tool = loadTool(
      type,
      async () => devices,
      async () => Promise.reject(error),
    );
    await assert.rejects(tool(), (actual) => actual === error);
  });
}
