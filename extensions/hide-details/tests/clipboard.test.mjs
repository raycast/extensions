import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFile, readdir, writeFile, mkdtemp, rm, mkdir, utimes, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = new URL("../", import.meta.url);
const temporary = await mkdtemp(path.join(tmpdir(), "hide-details-wrapper-test-"));
after(() => rm(temporary, { recursive: true, force: true }));
let sequence = 0;

const png = Buffer.alloc(24);
Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
png.write("IHDR", 12);
png.writeUInt32BE(100, 16);
png.writeUInt32BE(100, 20);
const hit = {
  kind: "email",
  text: "sample@example.com",
  confidence: 0.9,
  confidenceSource: "ocr",
  box: { x: 5, y: 10, width: 80, height: 20 },
};

async function loadSource(relative, replacements) {
  const source = await readFile(new URL(relative, root), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2021,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    require: (name) => replacements[name] ?? require(name),
    Buffer,
    process,
  });
  return module.exports;
}

async function harness({ preferences = {}, native } = {}) {
  const directory = path.join(temporary, String(sequence++));
  await mkdir(directory);
  const calls = [];
  const api = {
    environment: { assetsPath: "/bundled/assets" },
    getPreferenceValues: () => preferences,
  };
  const source = await loadSource("src/redaction.ts", {
    "@raycast/api": api,
    os: { tmpdir: () => directory },
    util: {
      promisify:
        (fn) =>
        (...args) =>
          new Promise((resolve, reject) => {
            fn(...args, (error, stdout, stderr) => (error ? reject(error) : resolve({ stdout, stderr })));
          }),
    },
    child_process: {
      execFile(file, args, options, callback) {
        calls.push({ file, args, options });
        Promise.resolve()
          .then(async () => {
            if (native) return native(args);
            if (args[0] === "--copy-clipboard") return "";
            await writeFile(args[1], png);
            return JSON.stringify({ hits: [hit], regionCount: 1, output: args[1], clipboardChangeCount: 17 });
          })
          .then(
            (stdout) => callback(null, stdout, ""),
            (error) => callback(error, "", error.stderr ?? ""),
          );
      },
    },
  });
  return {
    ...source,
    directory,
    calls,
    async outputs() {
      try {
        return await readdir(path.join(directory, "hide-details"));
      } catch (error) {
        if (error.code === "ENOENT") return [];
        throw error;
      }
    },
  };
}

async function absent(location) {
  await assert.rejects(access(location), { code: "ENOENT" });
}

test("overlapping reviews own distinct outputs and cleanup cannot delete another review", async () => {
  const wrapper = await harness();
  const [first, second] = await Promise.all([wrapper.redactClipboard(), wrapper.redactClipboard()]);
  assert.notEqual(first.output, second.output);
  assert.deepEqual((await wrapper.outputs()).length, 2);
  assert.deepEqual(await readdir(path.dirname(first.output)), ["out.png"]);
  await wrapper.copyRedacted(first);
  assert.deepEqual(Array.from(wrapper.calls.at(-1).args), ["--copy-clipboard", first.output]);
  await wrapper.disposeScan(first);
  await wrapper.disposeScan(first);
  await absent(first.output);
  await access(second.output);
  await assert.rejects(wrapper.copyRedacted(first), /expired/);
  await wrapper.disposeScan(second);
  assert.deepEqual(await wrapper.outputs(), []);
});

test("automatic copy guards source generation while review copy explicitly replaces clipboard", async () => {
  const wrapper = await harness();
  const scan = await wrapper.redactClipboard({ recognition: "accurate" });
  assert.equal(wrapper.calls[0].args[2], "blackout");
  assert.equal(wrapper.calls[0].args[6], "accurate");
  await wrapper.copyRedacted(scan, { requireOriginalClipboard: true });
  assert.deepEqual(Array.from(wrapper.calls.at(-1).args), ["--copy-clipboard", scan.output, "17"]);
  await wrapper.copyRedacted(scan);
  assert.deepEqual(Array.from(wrapper.calls.at(-1).args), ["--copy-clipboard", scan.output]);
  await wrapper.disposeScan(scan);
});

test("a valid scan without detections retains its own output", async () => {
  const wrapper = await harness({
    native: async (args) => {
      await writeFile(args[1], png);
      return JSON.stringify({ hits: [], regionCount: 0, output: args[1], clipboardChangeCount: 0 });
    },
  });
  const scan = await wrapper.redactClipboard();
  assert.equal(scan.regionCount, 0);
  await access(scan.output);
  await wrapper.disposeScan(scan);
});

for (const [description, change] of [
  ["foreign output", (report) => ({ ...report, output: "/somewhere/else.png" })],
  ["missing source generation", (report) => ({ ...report, clipboardChangeCount: undefined })],
  ["negative source generation", (report) => ({ ...report, clipboardChangeCount: -1 })],
  ["detections without rendered regions", (report) => ({ ...report, regionCount: 0 })],
  ["too many rendered regions", (report) => ({ ...report, regionCount: 2 })],
  ["incorrect unique geometry count", (report) => ({ ...report, hits: [hit, { ...hit, box: { ...hit.box, x: 6 } }] })],
  ["invalid confidence", (report) => ({ ...report, hits: [{ ...hit, confidence: 2 }] })],
  ["unknown confidence source", (report) => ({ ...report, hits: [{ ...hit, confidenceSource: "guaranteed" }] })],
  ["out-of-image geometry", (report) => ({ ...report, hits: [{ ...hit, box: { ...hit.box, x: 95 } }] })],
  ["empty mask", (report) => ({ ...report, hits: [{ ...hit, box: { ...hit.box, height: 0 } }] })],
]) {
  test(`invalid helper report cleans owned output for ${description}`, async () => {
    const wrapper = await harness({
      native: async (args) => {
        await writeFile(args[1], png);
        return JSON.stringify(change({ hits: [hit], regionCount: 1, output: args[1], clipboardChangeCount: 17 }));
      },
    });
    await assert.rejects(wrapper.redactClipboard(), /invalid result/);
    assert.deepEqual(await wrapper.outputs(), []);
  });
}

test("malformed JSON, missing output, bad PNG, and helper failures clean invocation directories", async () => {
  for (const behavior of ["json", "missing", "png", "failure"]) {
    const wrapper = await harness({
      native: async (args) => {
        if (behavior === "missing") return "{}";
        await writeFile(args[1], behavior === "png" ? Buffer.alloc(24) : png);
        if (behavior === "failure")
          throw Object.assign(new Error("process failed"), { stderr: "Readable native error" });
        return "not JSON";
      },
    });
    await assert.rejects(wrapper.redactClipboard());
    assert.deepEqual(await wrapper.outputs(), []);
  }
});

test("invalid preferences fail before reading the clipboard or creating output", async () => {
  for (const preferences of [
    { padding: "-12.5" },
    { padding: "Infinity" },
    { padding: "1001" },
    { categories: "email,unknown" },
    { style: "bad" },
  ]) {
    const wrapper = await harness({ preferences });
    await assert.rejects(wrapper.redactClipboard());
    assert.equal(wrapper.calls.length, 0);
    assert.deepEqual(await wrapper.outputs(), []);
  }
});

test("copy failures surface native error while retaining the review for retry", async () => {
  let failCopy = true;
  const wrapper = await harness({
    native: async (args) => {
      if (args[0] === "--copy-clipboard") {
        if (failCopy) throw Object.assign(new Error("process failed"), { stderr: "Clipboard write failed" });
        return "";
      }
      await writeFile(args[1], png);
      return JSON.stringify({ hits: [hit], regionCount: 1, output: args[1], clipboardChangeCount: 17 });
    },
  });
  const scan = await wrapper.redactClipboard();
  await assert.rejects(wrapper.copyRedacted(scan), /Clipboard write failed/);
  await access(scan.output);
  failCopy = false;
  await wrapper.copyRedacted(scan);
  await wrapper.disposeScan(scan);
});

test("expiry removes only old dead-owner runs and exact legacy regular files", async () => {
  const wrapper = await harness();
  const base = path.join(wrapper.directory, "hide-details");
  await mkdir(base);
  const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
  for (const name of ["run-99999999-Abc123", `run-${process.pid}-Live12`, "run-99999999-New123", "unrelated"]) {
    await mkdir(path.join(base, name));
    await writeFile(path.join(base, name, "out.png"), png);
    if (name !== "run-99999999-New123") await utimes(path.join(base, name), old, old);
  }
  for (const name of ["in.png", "out.png", "unrelated.png"]) {
    await writeFile(path.join(base, name), png);
    await utimes(path.join(base, name), old, old);
  }
  const scan = await wrapper.redactClipboard();
  await absent(path.join(base, "run-99999999-Abc123"));
  await absent(path.join(base, "in.png"));
  await absent(path.join(base, "out.png"));
  for (const name of [`run-${process.pid}-Live12`, "run-99999999-New123", "unrelated", "unrelated.png"]) {
    await access(path.join(base, name));
  }
  await wrapper.disposeScan(scan);
});

test("immediate command cleans output after a guarded clipboard change failure", async () => {
  const wrapper = await harness({
    native: async (args) => {
      if (args[0] === "--copy-clipboard") {
        assert.equal(args[2], "17");
        throw Object.assign(new Error("process failed"), {
          stderr: "The clipboard changed. The newer clipboard was kept.",
        });
      }
      await writeFile(args[1], png);
      return JSON.stringify({ hits: [hit], regionCount: 1, output: args[1], clipboardChangeCount: 17 });
    },
  });
  const toasts = [];
  const command = await loadSource("src/redact-now.tsx", {
    "./redaction": wrapper,
    "@raycast/api": {
      showHUD: async () => assert.fail("success HUD after failure"),
      showToast: async (toast) => toasts.push(toast),
      Toast: { Style: { Failure: "failure" } },
    },
  });
  await command.default();
  assert.match(toasts[0].message, /newer clipboard was kept/);
  assert.deepEqual(await wrapper.outputs(), []);
});

test("unmount disposes a scan that finishes after the review closes", async () => {
  let finish;
  const nativeFinished = new Promise((resolve) => {
    finish = resolve;
  });
  let started;
  const nativeStarted = new Promise((resolve) => {
    started = resolve;
  });
  const wrapper = await harness({
    native: async (args) => {
      started();
      await nativeFinished;
      await writeFile(args[1], png);
      return JSON.stringify({ hits: [hit], regionCount: 1, output: args[1], clipboardChangeCount: 17 });
    },
  });
  let mount;
  const stateValues = [];
  const command = await loadSource("src/redact-clipboard.tsx", {
    "./redaction": wrapper,
    react: {
      useState: (initial) => [initial, (value) => stateValues.push(value)],
      useRef: (initial) => ({ current: initial }),
      useCallback: (callback) => callback,
      useEffect: (callback) => {
        mount = callback;
      },
    },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "@raycast/api": { getPreferenceValues: () => ({}), Icon: {}, List: { Section: {}, Item: { Detail: {} } } },
  });
  command.default();
  const unmount = mount();
  await nativeStarted;
  unmount();
  finish();
  for (let attempts = 0; attempts < 50 && (await wrapper.outputs()).length; attempts++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.deepEqual(stateValues, [null, null]);
  assert.deepEqual(await wrapper.outputs(), []);
});

test(
  "native clipboard reads PNG/TIFF and guards stale copies on an isolated pasteboard",
  { timeout: 60_000 },
  async (t) => {
    const directory = path.join(temporary, "native-clipboard");
    await mkdir(directory);
    const main = path.join(directory, "main.swift");
    await writeFile(
      main,
      String.raw`
import AppKit
import Foundation

let pasteboard = NSPasteboard.withUniqueName()
guard !pasteboard.name.rawValue.isEmpty else { exit(77) }
defer { pasteboard.releaseGlobally() }
let generalGeneration = NSPasteboard.general.changeCount
let output = URL(fileURLWithPath: CommandLine.arguments[1])
let context = CGContext(data: nil, width: 32, height: 16, bitsPerComponent: 8, bytesPerRow: 0,
                        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
context.setFillColor(NSColor.red.cgColor)
context.fill(CGRect(x: 0, y: 0, width: 32, height: 16))
let representation = NSBitmapImageRep(cgImage: context.makeImage()!)
let png = representation.representation(using: .png, properties: [:])!
let tiff = representation.representation(using: .tiff, properties: [:])!
try png.write(to: output)

for (type, data) in [(NSPasteboard.PasteboardType.png, png), (.tiff, tiff)] {
  pasteboard.clearContents()
  precondition(pasteboard.setData(data, forType: type))
  let image = try readClipboardImage(pasteboard: pasteboard)
  precondition(image.image.width == 32 && image.image.height == 16)
  precondition(image.changeCount == pasteboard.changeCount)
}
let snapshot = try readClipboardImage(pasteboard: pasteboard)
pasteboard.clearContents()
precondition(pasteboard.setString("newer clipboard", forType: .string))
let newerGeneration = pasteboard.changeCount
do {
  try copyClipboardImage(outputURL: output, expectedChangeCount: snapshot.changeCount, pasteboard: pasteboard)
  preconditionFailure("A stale automatic copy must fail")
} catch ClipboardError.changed {}
precondition(pasteboard.changeCount == newerGeneration)
precondition(pasteboard.string(forType: .string) == "newer clipboard")

do {
  _ = try readClipboardImage(pasteboard: pasteboard)
  preconditionFailure("Text-only clipboard must fail image reading")
} catch ClipboardError.noImage {}
let invalid = output.deletingLastPathComponent().appendingPathComponent("invalid.png")
try Data("invalid".utf8).write(to: invalid)
do {
  try copyClipboardImage(outputURL: invalid, expectedChangeCount: nil, pasteboard: pasteboard)
  preconditionFailure("Invalid output must fail before changing the clipboard")
} catch ClipboardError.unreadableOutput {}
precondition(pasteboard.changeCount == newerGeneration)

final class FailingPasteboard: ClipboardPasteboard {
  let backing: NSPasteboard
  var partialWrite = false
  var newerCopy = false
  var failRestore = false
  var changeDuringSnapshot = false
  var unreadableSnapshot = false
  init(_ backing: NSPasteboard) { self.backing = backing }
  var changeCount: Int { backing.changeCount }
  var pasteboardItems: [NSPasteboardItem]? {
    let items = backing.pasteboardItems
    if changeDuringSnapshot {
      backing.clearContents()
      precondition(backing.setString("newer clipboard", forType: .string))
    }
    return unreadableSnapshot ? nil : items
  }
  func clearContents() -> Int { backing.clearContents() }
  func setData(_ data: Data?, forType type: NSPasteboard.PasteboardType) -> Bool {
    if partialWrite { precondition(backing.setData(data, forType: type)) }
    if newerCopy {
      backing.clearContents()
      precondition(backing.setString("newer clipboard", forType: .string))
    }
    return false
  }
  func writeObjects(_ objects: [NSPasteboardWriting]) -> Bool {
    !failRestore && backing.writeObjects(objects)
  }
}

let failing = FailingPasteboard(pasteboard)
for partialWrite in [false, true] {
  let first = NSPasteboardItem()
  precondition(first.setData(tiff, forType: .tiff))
  precondition(first.setString("original text", forType: .string))
  let second = NSPasteboardItem()
  let customType = NSPasteboard.PasteboardType("com.hide-details.test")
  let customData = Data([0, 1, 2, 255])
  precondition(second.setData(customData, forType: customType))
  pasteboard.clearContents()
  precondition(pasteboard.writeObjects([first, second]))
  failing.partialWrite = partialWrite
  do {
    try copyClipboardImage(outputURL: output, expectedChangeCount: nil, pasteboard: failing)
    preconditionFailure("A rejected write must fail")
  } catch ClipboardError.writeFailed {}
  let restored = pasteboard.pasteboardItems!
  precondition(restored.count == 2)
  precondition(Set(restored[0].types) == Set([.tiff, .string]))
  precondition(restored[0].data(forType: .tiff) == tiff)
  precondition(restored[0].string(forType: .string) == "original text")
  precondition(restored[1].types == [customType])
  precondition(restored[1].data(forType: customType) == customData)
}
failing.partialWrite = false
pasteboard.clearContents()
do {
  try copyClipboardImage(outputURL: output, expectedChangeCount: nil, pasteboard: failing)
  preconditionFailure("A rejected write on an empty clipboard must fail")
} catch ClipboardError.writeFailed {}
precondition(pasteboard.pasteboardItems?.isEmpty == true)

precondition(pasteboard.setString("original text", forType: .string))
failing.newerCopy = true
do {
  try copyClipboardImage(outputURL: output, expectedChangeCount: nil, pasteboard: failing)
  preconditionFailure("A concurrent copy must fail")
} catch ClipboardError.changed {}
precondition(pasteboard.string(forType: .string) == "newer clipboard")
failing.newerCopy = false

failing.changeDuringSnapshot = true
do {
  try copyClipboardImage(outputURL: output, expectedChangeCount: nil, pasteboard: failing)
  preconditionFailure("A concurrent copy during snapshot must fail")
} catch ClipboardError.changed {}
precondition(pasteboard.string(forType: .string) == "newer clipboard")
failing.changeDuringSnapshot = false

failing.unreadableSnapshot = true
let beforeUnreadable = pasteboard.changeCount
do {
  try copyClipboardImage(outputURL: output, expectedChangeCount: nil, pasteboard: failing)
  preconditionFailure("An unreadable snapshot must fail before clearing")
} catch ClipboardError.snapshotFailed {}
precondition(pasteboard.changeCount == beforeUnreadable)
precondition(pasteboard.string(forType: .string) == "newer clipboard")
failing.unreadableSnapshot = false

failing.failRestore = true
do {
  try copyClipboardImage(outputURL: output, expectedChangeCount: nil, pasteboard: failing)
  preconditionFailure("A rejected restoration must report its failure")
} catch ClipboardError.restoreFailed {}
failing.failRestore = false

try copyClipboardImage(outputURL: output, expectedChangeCount: nil, pasteboard: pasteboard)
precondition(pasteboard.data(forType: .png) == png)
let copiedGeneration = pasteboard.changeCount
try copyClipboardImage(outputURL: output, expectedChangeCount: copiedGeneration, pasteboard: pasteboard)
precondition(pasteboard.data(forType: .png) == png)
precondition(NSPasteboard.general.changeCount == generalGeneration)
print("PNG/TIFF read, no-image errors, stale-copy preservation, invalid-output preservation, and guarded/explicit copy passed.")
`,
    );
    const binary = path.join(directory, "test-clipboard");
    execFileSync(
      "xcrun",
      [
        "swiftc",
        "-module-cache-path",
        path.join(directory, "module-cache"),
        fileURLToPath(new URL("swift/Clipboard.swift", root)),
        main,
        "-o",
        binary,
      ],
      { timeout: 45_000, stdio: "pipe" },
    );
    try {
      const result = execFileSync(binary, [path.join(directory, "output.png")], { encoding: "utf8", timeout: 10_000 });
      assert.match(result, /PNG\/TIFF read/);
    } catch (error) {
      if (error.status === 77) {
        t.skip("The macOS pasteboard service is unavailable in this sandbox.");
        return;
      }
      throw error;
    }
  },
);

test("review masks all detection labels, uses real line breaks, and disposes replaced output", async () => {
  const privateHits = ["email", "phone", "card", "secret", "ip", "name", "face", "custom"].map((kind) => ({
    ...hit,
    kind,
    text: `${kind}: sensitive OCR text 4111.1111.1111.1111`,
  }));
  const wrapper = await harness({
    native: async (args) => {
      await writeFile(args[1], png);
      return JSON.stringify({ hits: privateHits, regionCount: 1, output: args[1], clipboardChangeCount: 17 });
    },
  });
  const preferences = {};
  let mount;
  let hookIndex = 0;
  const hooks = [];
  const jsx = (type, props) => ({ type, props });
  const command = await loadSource("src/redact-clipboard.tsx", {
    "./redaction": wrapper,
    react: {
      useState(initial) {
        const index = hookIndex++;
        if (!(index in hooks)) hooks[index] = initial;
        return [
          hooks[index],
          (value) => {
            hooks[index] = value;
          },
        ];
      },
      useRef(initial) {
        const index = hookIndex++;
        if (!(index in hooks)) hooks[index] = { current: initial };
        return hooks[index];
      },
      useCallback: (callback) => callback,
      useEffect: (callback) => {
        mount ??= callback;
      },
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "@raycast/api": {
      getPreferenceValues: () => preferences,
      Icon: {},
      Keyboard: { Shortcut: { Common: { Refresh: { modifiers: ["cmd"], key: "r" } } } },
      Action: {},
      ActionPanel: {},
      List: { Section: {}, Item: { Detail: {} } },
      Toast: { Style: { Success: "success", Failure: "failure" } },
      showToast: async () => {},
    },
  });
  const render = () => {
    hookIndex = 0;
    return command.default();
  };
  render();
  const unmount = mount();
  const waitForScan = async () => {
    for (let attempts = 0; attempts < 50 && !hooks[0]; attempts++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    assert.ok(hooks[0], "scan finishes");
    return hooks[0];
  };
  const first = await waitForScan();
  const tree = render();
  const preview = tree.props.children[0];
  assert.match(preview.props.detail.props.markdown, /\n\nReview/);
  assert.ok(!preview.props.detail.props.markdown.includes(String.raw`\n`));
  assert.ok(preview.props.detail.props.markdown.includes(first.output));
  const hitRow = tree.props.children[1].props.children[0];
  for (const row of tree.props.children[1].props.children) {
    assert.ok(["••••••••", "Face masked"].includes(row.props.subtitle), "detection label is masked");
  }
  for (const privateHit of privateHits) {
    assert.ok(!JSON.stringify(tree).includes(privateHit.text), "OCR text never enters rendered props");
  }
  assert.ok(hitRow.props.actions, "detection row offers Copy action");
  assert.equal(hitRow.props.accessories[0].text, "OCR 90%");
  preferences.showOCRConfidence = false;
  assert.equal(render().props.children[1].props.children[0].props.accessories.length, 0);
  preferences.showOCRConfidence = true;
  assert.equal(render().props.children[1].props.children[0].props.accessories[0].text, "OCR 90%");
  const scanAgain = preview.props.actions.props.children[1];
  await scanAgain.props.onAction();
  const second = await waitForScan();
  assert.notEqual(first.output, second.output);
  await absent(first.output);
  await access(second.output);
  unmount();
  for (let attempts = 0; attempts < 50 && (await wrapper.outputs()).length; attempts++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.deepEqual(await wrapper.outputs(), []);
});
