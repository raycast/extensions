const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function transpile(file) {
  return ts.transpileModule(fs.readFileSync(path.join(__dirname, "../src", file), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
}

const windowsSource = transpile("platform/windows.ts");
const audioSource = transpile("audio-device.ts");

function loadVolumes(outputs, results) {
  const calls = [];
  const windowsExports = {};
  // The tests use an installed binary and skip its checksum and version bootstrap.
  vm.runInNewContext(`${windowsSource}\nhasVerifiedBinaryThisSession = true; hasLoggedBinaryInfo = true;`, {
    exports: windowsExports,
    process: { pid: 1 },
    require: (name) => {
      if (name === "fs") return { existsSync: () => true };
      if (name === "@raycast/api") return { environment: { supportPath: "/test/audio-device" } };
      if (name === "execa") {
        return {
          execa: async (_binary, args) => {
            calls.push(Array.from(args));
            if (args[0] === "list") {
              return { stdout: JSON.stringify({ inputs: [{ id: "input" }], outputs }) };
            }
            assert.equal(args[0], "get-output-volume");
            const result = results[args[2]];
            if (result instanceof Error) throw result;
            return { stdout: JSON.stringify(result) };
          },
        };
      }
      assert.ok(["path", "https", "crypto"].includes(name));
      return require(name);
    },
  });
  const audioExports = {};
  vm.runInNewContext(audioSource, {
    exports: audioExports,
    require: (name) => {
      assert.equal(name, "./platform");
      return { getAudioAPI: async () => windowsExports.windowsAudioAPI };
    },
  });
  return { read: () => audioExports.getAllVolumeInfo("output"), calls };
}

test("Windows output volume data reaches the device list and preserves zero volume", async () => {
  const { read, calls } = loadVolumes([{ id: "speaker" }, { id: "headphones" }], {
    speaker: { type: "output", volume: 45, device: { id: "speaker" } },
    headphones: { type: "output", volume: 0, device: { id: "headphones" } },
  });
  const volumes = await read();
  assert.deepEqual(Object.keys(volumes).sort(), ["headphones", "speaker"]);
  assert.equal(volumes.speaker.volume, 0.45);
  assert.equal(volumes.headphones.volume, 0);
  assert.equal(volumes.speaker.muted, undefined);
  assert.deepEqual(calls, [
    ["list", "--json"],
    ["get-output-volume", "--id", "speaker"],
    ["get-output-volume", "--id", "headphones"],
  ]);
});

test("an unreadable Windows output does not hide controls for other outputs", async () => {
  const { read } = loadVolumes([{ id: "unreadable" }, { id: "speaker" }, { id: "mismatched" }], {
    unreadable: new Error("Volume is unavailable"),
    speaker: { type: "output", volume: 60, device: { id: "speaker" } },
    mismatched: { type: "output", volume: 80, device: { id: "another-output" } },
  });
  const volumes = await read();
  assert.equal(volumes.unreadable.volume, undefined);
  assert.equal(volumes.mismatched.volume, undefined);
  assert.equal(volumes.speaker.volume, 0.6);
});

test("an empty Windows output list does not query input devices for volume", async () => {
  const { read, calls } = loadVolumes([], {});
  assert.deepEqual(Object.keys(await read()), []);
  assert.deepEqual(calls, [["list", "--json"]]);
});
