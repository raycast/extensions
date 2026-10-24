const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../src/tools/get-audio-volume.ts"), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});

function loadTool(type, getVolume) {
  const exports = {};
  const suffix = type === "input" ? "Input" : "Output";
  vm.runInNewContext(outputText, {
    exports,
    require: (name) => {
      assert.equal(name, "../audio-device");
      return {
        [`getDefault${suffix}Device`]: async () => ({ id: "device-1", name: "Active device" }),
        [`get${suffix}DeviceVolume`]: async (id) => {
          assert.equal(id, "device-1");
          return getVolume();
        },
      };
    },
  });
  return () => exports.default({ type });
}

for (const type of ["input", "output"]) {
  test(`${type}: reads the active device volume as a rounded percentage`, async () => {
    const tool = loadTool(type, () => 0.654);
    assert.equal(await tool(), `Active device ${type} volume is 65%.`);
  });

  test(`${type}: zero volume is supported`, async () => {
    const tool = loadTool(type, () => 0);
    assert.equal(await tool(), `Active device ${type} volume is 0%.`);
  });

  test(`${type}: reports unsupported volume`, async () => {
    const tool = loadTool(type, () => undefined);
    await assert.rejects(tool(), /Active device does not support volume control/);
  });

  test(`${type}: propagates volume lookup errors`, async () => {
    const error = new Error("Audio backend unavailable");
    const tool = loadTool(type, () => Promise.reject(error));
    await assert.rejects(tool(), (actual) => actual === error);
  });
}
