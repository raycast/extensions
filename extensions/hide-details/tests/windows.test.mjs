import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PassThrough, Writable } from "node:stream";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
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

test("face blur renders before overlapping text blackout without changing region counts", async () => {
  const backend = helper({ ...analysis, faces: [{ x: 55, y: 15, width: 5, height: 20 }] });
  const report = await backend.windows.redactImage({ ...options, blurFaces: true });
  assert.deepEqual(backend.requests[1].regions, [
    { x: 55, y: 15, width: 5, height: 20, style: "blur" },
    { x: 55, y: 15, width: 5, height: 20, style: "blackout" },
  ]);
  assert.equal(report.regionCount, 1);
});

test(
  "bundled Windows helper scans and renders empty and single-item results",
  { skip: process.platform !== "win32" },
  async (t) => {
    const root = fileURLToPath(new URL("..", import.meta.url));
    const directory = mkdtempSync(path.join(tmpdir(), "hide-details-windows-test-"));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const windows = loadSource("../src/windows.ts", {
      "@raycast/api": { environment: { assetsPath: path.join(root, "assets") } },
      "./detection": { ...detection, ocrBox, regionBox },
    });
    await t.test("clipboard sequence can be read without changing the clipboard", async () => {
      const count = await windows.clipboardChangeCount();
      assert.ok(Number.isSafeInteger(count) && count >= 0 && count <= 0xffffffff);
    });
    // Only Raycast and TS module loading are replaced. spawn and the shipped script run unchanged.
    function powershell(script, report = {}) {
      return execFileSync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script], {
        encoding: "utf8",
        timeout: 30_000,
        env: {
          ...process.env,
          HIDE_DETAILS_TEST_DIRECTORY: directory,
          HIDE_DETAILS_TEST_REPORT: JSON.stringify(report),
        },
      });
    }
    powershell(`
    $ErrorActionPreference = 'Stop'
    Add-Type -AssemblyName System.Drawing
    $bitmap = New-Object System.Drawing.Bitmap 480, 100
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $font = New-Object System.Drawing.Font 'Arial', 28, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
    try {
      $graphics.Clear([System.Drawing.Color]::White)
      $bitmap.Save((Join-Path $env:HIDE_DETAILS_TEST_DIRECTORY 'blank.png'), [System.Drawing.Imaging.ImageFormat]::Png)
      $graphics.DrawString('jane@example.com', $font, [System.Drawing.Brushes]::Black, 20, 30)
      $bitmap.Save((Join-Path $env:HIDE_DETAILS_TEST_DIRECTORY 'email.png'), [System.Drawing.Imaging.ImageFormat]::Png)
    } finally { $font.Dispose(); $graphics.Dispose(); $bitmap.Dispose() }
  `);

    const cases = [
      { name: "detection disabled", input: "blank.png", categories: [], kind: null },
      { name: "empty OCR and face arrays", input: "blank.png", categories: ["email", "face"], kind: null },
      { name: "one OCR line with faces disabled", input: "email.png", categories: ["email"], kind: "email" },
      { name: "one OCR line and no faces", input: "email.png", categories: ["email", "face"], kind: "email" },
      {
        name: "one face with OCR disabled",
        input: path.join(root, "tests", "fixtures", "face.jpg"),
        categories: ["face"],
        kind: "face",
      },
      {
        name: "face blur overrides blackout",
        input: path.join(root, "tests", "fixtures", "face.jpg"),
        categories: ["face"],
        kind: "face",
        blurFaces: true,
      },
    ];
    for (const [index, scenario] of cases.entries()) {
      await t.test(scenario.name, async () => {
        const report = await windows.redactImage({
          ...options,
          inputPath: path.resolve(directory, scenario.input),
          outputPath: path.join(directory, `output-${index}.png`),
          categories: new Set(scenario.categories),
          recognition: "fast",
          blurFaces: scenario.blurFaces ?? false,
        });
        assert.equal(report.output, path.join(directory, `output-${index}.png`));
        assert.equal(report.clipboardChangeCount, null);
        assert.deepEqual(
          report.hits.map((hit) => hit.kind),
          scenario.kind ? [scenario.kind] : [],
        );
        assert.equal(report.regionCount, scenario.kind ? 1 : 0);
        if (scenario.kind === "email") assert.equal(report.hits[0].text.replace(/\s/g, ""), "jane@example.com");
        assert.deepEqual([...readFileSync(report.output).subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
        powershell(
          `
        $ErrorActionPreference = 'Stop'
        Add-Type -AssemblyName System.Drawing
        $report = ConvertFrom-Json $env:HIDE_DETAILS_TEST_REPORT
        $bitmap = New-Object System.Drawing.Bitmap $report.output
        $source = New-Object System.Drawing.Bitmap $report.inputPath
        try {
          if ($bitmap.Width -ne $source.Width -or $bitmap.Height -ne $source.Height) { throw 'Image dimensions changed' }
          if ($bitmap.GetPixel(0, 0).ToArgb() -ne $source.GetPixel(0, 0).ToArgb()) { throw 'Unmasked corner changed' }
          if ($report.regionCount -eq 0) {
            for ($y = 0; $y -lt $bitmap.Height; $y++) {
              for ($x = 0; $x -lt $bitmap.Width; $x++) {
                if ($bitmap.GetPixel($x, $y).ToArgb() -ne $source.GetPixel($x, $y).ToArgb()) { throw 'Empty scan changed pixels' }
              }
            }
          }
          foreach ($hit in $report.hits) {
            $box = $hit.box
            $changed = 0
            $nonBlack = 0
            for ($y = $box.y; $y -lt $box.y + $box.height; $y++) {
              for ($x = $box.x; $x -lt $box.x + $box.width; $x++) {
                $pixel = $bitmap.GetPixel($x, $y).ToArgb()
                if ($pixel -ne $source.GetPixel($x, $y).ToArgb()) { $changed++ }
                if ($pixel -ne [System.Drawing.Color]::Black.ToArgb()) { $nonBlack++ }
              }
            }
            if ($report.blurFaces) {
              if ($changed -eq 0 -or $nonBlack -eq 0) { throw 'Face was not blurred' }
            } elseif ($nonBlack -ne 0) { throw 'Mask has an unredacted pixel' }
          }
        } finally { $source.Dispose(); $bitmap.Dispose() }
      `,
          { ...report, inputPath: path.resolve(directory, scenario.input), blurFaces: scenario.blurFaces ?? false },
        );
      });
    }

    // Request order never executes the renderer. Draw the address across the detected face and require those pixels to stay black.
    await t.test("overlapping face blur keeps every text-mask pixel black", async () => {
      const faceInput = path.join(root, "tests", "fixtures", "face.jpg");
      const detected = await windows.redactImage({
        ...options,
        inputPath: faceInput,
        outputPath: path.join(directory, "overlap-face.png"),
        categories: new Set(["face"]),
        recognition: "fast",
      });
      assert.equal(detected.hits.length, 1);
      assert.equal(detected.hits[0].kind, "face");
      powershell(
        `
        $ErrorActionPreference = 'Stop'
        Add-Type -AssemblyName System.Drawing
        $report = ConvertFrom-Json $env:HIDE_DETAILS_TEST_REPORT
        $source = New-Object System.Drawing.Bitmap $report.inputPath
        $bitmap = New-Object System.Drawing.Bitmap($source.Width, $source.Height)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $font = New-Object System.Drawing.Font 'Arial', 28, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
        try {
          $graphics.DrawImage($source, 0, 0, $source.Width, $source.Height)
          $face = $report.face
          $text = 'jane@example.com'
          $measured = $graphics.MeasureString($text, $font)
          $bandWidth = [Math]::Min($bitmap.Width, [int][Math]::Ceiling($measured.Width) + 12)
          $bandHeight = [Math]::Max(40, [int][Math]::Ceiling($measured.Height) + 10)
          if ($bandHeight -gt [int][Math]::Floor([double]$face.height * 0.4)) { throw 'Face box is too small for an overlapping text mask' }
          $bandX = [int][Math]::Floor([double]$face.x + ([double]$face.width - $bandWidth) / 2)
          $bandY = [int][Math]::Floor([double]$face.y + [double]$face.height - $bandHeight - [double]$face.height * 0.08)
          if ($bandX -lt 0) { $bandX = 0 }
          if ($bandY -lt 0) { $bandY = 0 }
          if ($bandX + $bandWidth -gt $bitmap.Width) { $bandX = $bitmap.Width - $bandWidth }
          if ($bandY + $bandHeight -gt $bitmap.Height) { $bandY = $bitmap.Height - $bandHeight }
          $graphics.FillRectangle([System.Drawing.Brushes]::White, $bandX, $bandY, $bandWidth, $bandHeight)
          $graphics.DrawString($text, $font, [System.Drawing.Brushes]::Black, ($bandX + 6), ($bandY + 4))
          $bitmap.Save((Join-Path $env:HIDE_DETAILS_TEST_DIRECTORY 'overlap.png'), [System.Drawing.Imaging.ImageFormat]::Png)
        } finally { $font.Dispose(); $graphics.Dispose(); $bitmap.Dispose(); $source.Dispose() }
      `,
        { inputPath: faceInput, face: detected.hits[0].box },
      );

      const report = await windows.redactImage({
        ...options,
        inputPath: path.join(directory, "overlap.png"),
        outputPath: path.join(directory, "overlap-output.png"),
        categories: new Set(["email", "face"]),
        recognition: "fast",
        blurFaces: true,
      });
      const email = report.hits.find((hit) => hit.kind === "email");
      const face = report.hits.find((hit) => hit.kind === "face");
      assert.ok(email, "missing email mask");
      assert.ok(face, "missing face mask");
      assert.equal(report.hits.length, 2);
      assert.equal(email.text.replace(/\s/g, ""), "jane@example.com");
      assert.equal(report.clipboardChangeCount, null);
      assert.ok(email.box.width > 0 && email.box.height > 0);
      assert.ok(
        email.box.x < face.box.x + face.box.width &&
          face.box.x < email.box.x + email.box.width &&
          email.box.y < face.box.y + face.box.height &&
          face.box.y < email.box.y + email.box.height,
        "face blur does not overlap the text mask",
      );
      assert.deepEqual([...readFileSync(report.output).subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      powershell(
        `
        $ErrorActionPreference = 'Stop'
        Add-Type -AssemblyName System.Drawing
        $report = ConvertFrom-Json $env:HIDE_DETAILS_TEST_REPORT
        $bitmap = New-Object System.Drawing.Bitmap $report.output
        try {
          $box = $report.text
          $left = [int]$box.x
          $top = [int]$box.y
          $right = $left + [int]$box.width
          $bottom = $top + [int]$box.height
          for ($y = $top; $y -lt $bottom; $y++) {
            for ($x = $left; $x -lt $right; $x++) {
              if ($bitmap.GetPixel($x, $y).ToArgb() -ne [System.Drawing.Color]::Black.ToArgb()) { throw "Text mask pixel $x,$y is not black" }
            }
          }
        } finally { $bitmap.Dispose() }
      `,
        { output: report.output, text: email.box },
      );
    });
  },
);
