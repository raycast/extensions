import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { PassThrough, Writable } from "node:stream";
import { test } from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadSource(relative, replacements = {}) {
  const source = readFileSync(new URL(relative, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  const module = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (name) => replacements[name] ?? require(name),
    module,
    module.exports,
  );
  return module.exports;
}

const { ocrBox, regionBox, ...detection } = loadSource("../src/detection.ts");

function nearBox(actual, expected) {
  for (const key of ["x", "y", "width", "height"]) {
    assert.ok(Math.abs(actual[key] - expected[key]) < 1e-9, `${key}: ${actual[key]} != ${expected[key]}`);
  }
}

test("Windows OCR boxes rotate clockwise about the image center before masking", () => {
  const image = { width: 200, height: 100 };
  const box = { x: 80, y: 30, width: 40, height: 10 };
  nearBox(ocrBox(box, { ...image, angle: 0 }, image), box);
  nearBox(ocrBox(box, { ...image, angle: 90 }, image), { x: 110, y: 30, width: 10, height: 40 });
  nearBox(ocrBox(box, { ...image, angle: -90 }, image), { x: 80, y: 30, width: 10, height: 40 });
});

test("slanted text masks enclose all four rotated corners", () => {
  const image = { width: 200, height: 200 };
  const box = { x: 60, y: 80, width: 80, height: 20 };
  // Fixed corner coordinates for a 45-degree clockwise rotation around (100, 100).
  const corners = [
    [85.85786437626905, 57.57359312880715],
    [142.42640687119285, 114.14213562373095],
    [71.7157287525381, 71.7157287525381],
    [128.2842712474619, 128.2842712474619],
  ];
  const mask = regionBox(ocrBox(box, { ...image, angle: 45 }, image), 0, image.width, image.height);
  assert.deepEqual(mask, { x: 71, y: 57, width: 72, height: 72 });
  for (const [x, y] of corners) {
    assert.ok(x >= mask.x && x <= mask.x + mask.width && y >= mask.y && y <= mask.y + mask.height);
  }
});

test("OCR resize rounding uses the actual scale of each axis", () => {
  const original = { width: 301, height: 199 };
  const resized = { width: 150, height: 99, angle: 0 };
  nearBox(ocrBox({ x: 0, y: 0, width: 150, height: 99 }, resized, original), { x: 0, y: 0, ...original });
  assert.deepEqual(regionBox(ocrBox({ x: 149, y: 98, width: 1, height: 1 }, resized, original), 0, 301, 199), {
    x: 298,
    y: 196,
    width: 3,
    height: 3,
  });
  nearBox(
    ocrBox({ x: 80, y: 30, width: 40, height: 10 }, { width: 200, height: 100, angle: 90 }, { width: 100, height: 50 }),
    { x: 55, y: 15, width: 5, height: 20 },
  );
});

test("invalid OCR dimensions or angles fail before publishing masks", () => {
  const image = { width: 200, height: 100 };
  for (const ocr of [
    { ...image, angle: NaN },
    { ...image, angle: Infinity },
    { width: 0, height: 100, angle: 0 },
    { width: 200, height: -1, angle: 0 },
  ]) {
    assert.throws(() => ocrBox({ x: 10, y: 10, width: 20, height: 20 }, ocr, image), /invalid image geometry/);
  }
});

function helper(analysis) {
  const requests = [];
  let killed = false;
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.stdin = new Writable({
    write(chunk, encoding, callback) {
      requests.push(JSON.parse(chunk.toString()));
      setImmediate(() => {
        if (requests.length === 1) child.stdout.write(`${JSON.stringify(analysis)}\n`);
        else {
          child.stdout.end('{"done":true}\n');
          setImmediate(() => child.emit("close", 0));
        }
      });
      callback();
    },
  });
  child.kill = () => {
    killed = true;
    child.stdout.end();
    setImmediate(() => child.emit("close", null));
  };
  const windows = loadSource("../src/windows.ts", {
    "@raycast/api": { environment: { assetsPath: "/assets" } },
    child_process: { spawn: () => child },
    "./detection": { ...detection, ocrBox, regionBox },
  });
  return {
    windows,
    requests,
    get killed() {
      return killed;
    },
  };
}

const options = {
  outputPath: "/output.png",
  style: "blackout",
  padding: 0,
  categories: new Set(["email", "face"]),
  extraWords: "",
  recognition: "accurate",
  customRegex: "",
  inputPath: "/input.png",
};
const analysis = {
  width: 100,
  height: 50,
  changeCount: null,
  text: {
    width: 200,
    height: 100,
    angle: 90,
    lines: [{ text: "jane@example.com", custom: false, box: { x: 80, y: 30, width: 40, height: 10 } }],
  },
  faces: [{ x: 10, y: 10, width: 10, height: 10 }],
};

test("Windows helper protocol transforms OCR boxes and leaves face boxes in original coordinates", async () => {
  const backend = helper(analysis);
  const report = await backend.windows.redactImage(options);
  assert.deepEqual(backend.requests[1], {
    output: "/output.png",
    regions: [
      { x: 55, y: 15, width: 5, height: 20 },
      { x: 10, y: 10, width: 10, height: 10 },
    ],
  });
  assert.equal(report.regionCount, 2);
  assert.equal(report.clipboardChangeCount, null);
  assert.equal(report.output, "/output.png");
});

test("invalid OCR geometry stops the Windows helper before rendering", async () => {
  const backend = helper({ ...analysis, text: { ...analysis.text, width: 0 } });
  await assert.rejects(backend.windows.redactImage(options), /invalid image geometry/);
  assert.equal(backend.requests.length, 1);
  assert.equal(backend.killed, true);
});
