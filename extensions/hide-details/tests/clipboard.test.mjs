import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFile, readdir, writeFile, mkdtemp, rm, mkdir, utimes, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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

async function harness({ preferences = {}, native, history = [] } = {}) {
  const directory = path.join(temporary, String(sequence++));
  await mkdir(directory);
  const calls = [];
  const invoke = async (operation, args) => {
    calls.push({ operation, args });
    if (native) {
      const result = await native(args, operation);
      return operation === "redactImage" && result && typeof result === "object"
        ? { reviewKey: Buffer.alloc(32, 1).toString("base64"), ...result }
        : result;
    }
    if (operation === "updateReviewImage") {
      await writeFile(args[4], png);
      return new Set(JSON.parse(args[2]).map((mask) => JSON.stringify(mask.box))).size;
    }
    if (operation === "copyRedactedImage") return;
    await writeFile(args[0], png);
    return {
      hits: [hit],
      regionCount: 1,
      output: args[0],
      clipboardChangeCount: 17,
      reviewKey: Buffer.alloc(32, 1).toString("base64"),
    };
  };
  const api = { getPreferenceValues: () => preferences, LocalStorage: { getItem: async () => undefined } };
  const categoryModule = await loadSource("src/categories.ts", { "@raycast/api": api });
  const source = await loadSource("src/redaction.ts", {
    "./categories": categoryModule,
    "@raycast/api": {
      ...api,
      getPreferenceValues: () => preferences,
      Clipboard: {
        read: async ({ offset }) => {
          if (history[offset] instanceof Error) throw history[offset];
          return history[offset] ?? { text: "" };
        },
      },
    },
    os: { tmpdir: () => directory },
    "swift:../swift/hide-details": {
      updateReviewImage: (...args) => invoke("updateReviewImage", args),
      redactImage: (...args) => invoke("redactImage", args),
      copyRedactedImage: (...args) => invoke("copyRedactedImage", args),
      clipboardChangeCount: async () => 17,
    },
    "./windows": {},
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
  assert.equal(wrapper.calls.at(-1).operation, "copyRedactedImage");
  assert.deepEqual(Array.from(wrapper.calls.at(-1).args), [first.output, null]);
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
  assert.equal(wrapper.calls[0].operation, "redactImage");
  assert.equal(wrapper.calls[0].args[7], null);
  assert.equal(wrapper.calls[0].args[1], "blackout");
  assert.equal(wrapper.calls[0].args[5], "accurate");
  await wrapper.copyRedacted(scan, { requireOriginalClipboard: true });
  assert.deepEqual(Array.from(wrapper.calls.at(-1).args), [scan.output, 17]);
  await wrapper.copyRedacted(scan);
  assert.deepEqual(Array.from(wrapper.calls.at(-1).args), [scan.output, null]);
  await wrapper.disposeScan(scan);
});

test("a valid scan without detections retains its own output", async () => {
  const wrapper = await harness({
    native: async (args) => {
      await writeFile(args[0], png);
      return { hits: [], regionCount: 0, output: args[0], clipboardChangeCount: 0 };
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
        await writeFile(args[0], png);
        return change({ hits: [hit], regionCount: 1, output: args[0], clipboardChangeCount: 17 });
      },
    });
    await assert.rejects(wrapper.redactClipboard(), /invalid result/);
    assert.deepEqual(await wrapper.outputs(), []);
  });
}

test("invalid native results, missing output, bad PNG, and bridge failures clean invocation directories", async () => {
  for (const behavior of ["result", "missing", "png", "failure"]) {
    const wrapper = await harness({
      native: async (args) => {
        if (behavior === "missing") return {};
        await writeFile(args[0], behavior === "png" ? Buffer.alloc(24) : png);
        if (behavior === "failure")
          throw Object.assign(new Error("process failed"), { stderr: "Readable native error" });
        return "not a report";
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
    native: async (args, operation) => {
      if (operation === "copyRedactedImage") {
        if (failCopy) throw Object.assign(new Error("process failed"), { stderr: "Clipboard write failed" });
        return "";
      }
      await writeFile(args[0], png);
      return { hits: [hit], regionCount: 1, output: args[0], clipboardChangeCount: 17 };
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
    native: async (args, operation) => {
      if (operation === "copyRedactedImage") {
        assert.equal(args[1], 17);
        throw Object.assign(new Error("process failed"), {
          stderr: "The clipboard changed. The newer clipboard was kept.",
        });
      }
      await writeFile(args[0], png);
      return { hits: [hit], regionCount: 1, output: args[0], clipboardChangeCount: 17 };
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
      await writeFile(args[0], png);
      return { hits: [hit], regionCount: 1, output: args[0], clipboardChangeCount: 17 };
    },
  });
  let mount;
  const stateValues = [];
  const review = await loadSource("src/review.tsx", {
    "./category-settings": { CategorySettings: () => null },
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
  review.Review({
    load: (recognition) => wrapper.redactClipboard({ recognition, forReview: true }),
    target: "clipboard",
  });
  const unmount = mount();
  await nativeStarted;
  unmount();
  finish();
  for (let attempts = 0; attempts < 50 && (await wrapper.outputs()).length; attempts++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.deepEqual(stateValues, [false, null, null]);
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
  var acceptWrite = false
  var partialWrite = false
  var newerCopy = false
  var failRestore = false
  var changeDuringSnapshot = false
  var unreadableSnapshot = false
  var snapshotItems: [NSPasteboardItem]?
  init(_ backing: NSPasteboard) { self.backing = backing }
  var changeCount: Int { backing.changeCount }
  var pasteboardItems: [NSPasteboardItem]? {
    let items = backing.pasteboardItems
    if changeDuringSnapshot {
      backing.clearContents()
      precondition(backing.setString("newer clipboard", forType: .string))
    }
    return unreadableSnapshot ? nil : (snapshotItems ?? items)
  }
  func clearContents() -> Int { backing.clearContents() }
  func setData(_ data: Data?, forType type: NSPasteboard.PasteboardType) -> Bool {
    if partialWrite { precondition(backing.setData(data, forType: type)) }
    if newerCopy {
      backing.clearContents()
      precondition(backing.setString("newer clipboard", forType: .string))
    }
    return acceptWrite && backing.setData(data, forType: type)
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

final class UnreadableItem: NSPasteboardItem {
  static let unavailableType = NSPasteboard.PasteboardType("com.hide-details.unavailable")
  override func data(forType type: NSPasteboard.PasteboardType) -> Data? {
    type == Self.unavailableType ? nil : super.data(forType: type)
  }
}
let mixedItem = UnreadableItem()
precondition(mixedItem.setData(tiff, forType: .tiff))
precondition(mixedItem.setString("readable original", forType: .string))
precondition(mixedItem.setData(Data([1]), forType: UnreadableItem.unavailableType))
let unreadableItem = UnreadableItem()
precondition(unreadableItem.setData(Data([2]), forType: UnreadableItem.unavailableType))
let lastItem = NSPasteboardItem()
precondition(lastItem.setString("last original", forType: .string))
failing.snapshotItems = [mixedItem, unreadableItem, lastItem]
do {
  try copyClipboardImage(outputURL: output, expectedChangeCount: nil, pasteboard: failing)
  preconditionFailure("A rejected write with an incomplete backup must report incomplete recovery")
} catch ClipboardError.restoreFailed {}
let readableRestored = pasteboard.pasteboardItems!
precondition(readableRestored.count == 2)
precondition(readableRestored[0].data(forType: .tiff) == tiff)
precondition(readableRestored[0].string(forType: .string) == "readable original")
precondition(readableRestored[1].string(forType: .string) == "last original")
precondition(!readableRestored[0].types.contains(UnreadableItem.unavailableType))
failing.acceptWrite = true
for guarded in [false, true] {
  let expectedChangeCount = guarded ? pasteboard.changeCount : nil
  try copyClipboardImage(outputURL: output, expectedChangeCount: expectedChangeCount, pasteboard: failing)
  precondition(pasteboard.data(forType: .png) == png)
  precondition(pasteboard.pasteboardItems?.count == 1)
  precondition(pasteboard.string(forType: .string) == nil)
  precondition(!(pasteboard.types ?? []).contains(UnreadableItem.unavailableType))
}
failing.snapshotItems = nil

failing.unreadableSnapshot = true
try copyClipboardImage(outputURL: output, expectedChangeCount: nil, pasteboard: failing)
precondition(pasteboard.data(forType: .png) == png)
failing.acceptWrite = false
do {
  try copyClipboardImage(outputURL: output, expectedChangeCount: nil, pasteboard: failing)
  preconditionFailure("A rejected write without a backup must report incomplete recovery")
} catch ClipboardError.restoreFailed {}
failing.unreadableSnapshot = false

precondition(pasteboard.setString("original text", forType: .string))
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
        fileURLToPath(new URL("swift/hide-details/Sources/Clipboard.swift", root)),
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
  let finishRender;
  let renderGate;
  let failRender = false;
  const wrapper = await harness({
    native: async (args, operation) => {
      if (operation === "copyRedactedImage") return;
      if (operation === "updateReviewImage") {
        if (renderGate) await renderGate;
        await writeFile(args[4], png);
        if (failRender) throw new Error("synthetic render failure");
        return new Set(JSON.parse(args[2]).map((mask) => JSON.stringify(mask.box))).size;
      }
      await writeFile(args[0], png);
      return { hits: privateHits, regionCount: 1, output: args[0], clipboardChangeCount: 17 };
    },
  });
  const preferences = {};
  let mount;
  let hookIndex = 0;
  const hooks = [];
  const jsx = (type, props) => ({ type, props });
  const review = await loadSource("src/review.tsx", {
    "./category-settings": { CategorySettings: () => null },
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
      Color: { Orange: "orange" },
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
    return review.Review({
      load: (recognition) => wrapper.redactClipboard({ recognition, forReview: true }),
      target: "clipboard",
    });
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
  const action = (row, title) => row.props.actions.props.children.find((action) => action?.props?.title === title);
  const detectionRow = () => render().props.children[1].props.children[0];
  renderGate = new Promise((resolve) => {
    finishRender = resolve;
  });
  const toggle = action(detectionRow(), "Don't Redact").props.onAction();
  assert.equal(render().props.isLoading, true);
  assert.equal(action(detectionRow(), "Copy Redacted Image"), undefined);
  // Even a stale keyboard action from the previous render cannot copy during an update.
  const copies = wrapper.calls.filter((call) => call.operation === "copyRedactedImage").length;
  await action(hitRow, "Copy Redacted Image").props.onAction();
  assert.equal(wrapper.calls.filter((call) => call.operation === "copyRedactedImage").length, copies);
  finishRender();
  await toggle;
  renderGate = undefined;
  assert.equal(detectionRow().props.id, first.hits[0].id);
  assert.equal(detectionRow().props.accessories[0].tag.value, "Don't Redact");
  assert.equal(hooks[0].regionCount, 1, "overlapping enabled detections still cover the same region");
  assert.ok(detectionRow().props.detail.props.markdown.includes(hooks[0].output));
  await action(detectionRow(), "Copy Redacted Image").props.onAction();
  assert.equal(wrapper.calls.at(-1).args[0], hooks[0].output);
  failRender = true;
  await action(detectionRow(), "Redact").props.onAction();
  assert.ok(action(detectionRow(), "Redact"), "failed edit retains the prior state for retry");
  failRender = false;
  await action(detectionRow(), "Redact").props.onAction();
  assert.ok(action(detectionRow(), "Don't Redact"));
  await action(detectionRow(), "Don't Redact").props.onAction();
  await action(detectionRow(), "Redact All Detections").props.onAction();
  assert.deepEqual(Array.from(hooks[0].excludedIds), []);
  const scanAgain = action(render().props.children[0], "Scan Current Clipboard Again");
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

const noImage = () =>
  Object.assign(new Error("process failed"), { stderr: "Clipboard has no image. Copy a screenshot first." });

async function historyFiles() {
  const directory = path.join(temporary, `history-${sequence++}`);
  await mkdir(directory);
  const files = {};
  for (const name of ["notes.txt", "shot.png", "photo.JPG", "pruned.png"]) files[name] = path.join(directory, name);
  for (const name of ["notes.txt", "shot.png", "photo.JPG"]) await writeFile(files[name], png);
  return files;
}

test("clipboard history lists only existing image files, newest first, without duplicates", async () => {
  const files = await historyFiles();
  const wrapper = await harness({
    history: [
      { text: "plain text" },
      { text: "notes.txt", file: files["notes.txt"] },
      { text: "shot.png", file: files["shot.png"] },
      new Error("history unavailable"),
      { text: "photo", file: pathToFileURL(files["photo.JPG"]).href },
      { text: "pruned", file: files["pruned.png"] },
    ],
  });
  const images = await wrapper.clipboardHistoryImageFiles();
  assert.deepEqual(
    Array.from(images, ({ offset, path }) => [offset, path]),
    [
      [2, files["shot.png"]],
      [4, files["photo.JPG"]],
    ],
  );
  assert.ok(images[0].modified instanceof Date);
  assert.equal((await wrapper.clipboardHistoryImageFiles(1)).length, 1);
});

test("a history scan reads the file and never claims a clipboard generation", async () => {
  const files = await historyFiles();
  const wrapper = await harness({
    native: async (args) => {
      await writeFile(args[0], png);
      return { hits: [hit], regionCount: 1, output: args[0], clipboardChangeCount: null };
    },
  });
  const image = { offset: 3, path: files["shot.png"], modified: new Date() };
  const scan = await wrapper.redactHistoryImage(image, { recognition: "accurate" });
  assert.equal(wrapper.calls[0].args[7], files["shot.png"]);
  assert.equal(wrapper.calls[0].args[5], "accurate");
  assert.equal(scan.source.kind, "history");
  assert.equal(scan.source.offset, 3);
  assert.equal(scan.clipboardChangeCount, null);
  await wrapper.copyRedacted(scan, { requireOriginalClipboard: true });
  assert.deepEqual(Array.from(wrapper.calls.at(-1).args), [scan.output, null]);
  await wrapper.disposeScan(scan);
  assert.deepEqual(await wrapper.outputs(), []);

  const lying = await harness({
    native: async (args) => {
      await writeFile(args[0], png);
      return { hits: [], regionCount: 0, output: args[0], clipboardChangeCount: 4 };
    },
  });
  await assert.rejects(lying.redactHistoryImage(image), /invalid result/);
  assert.deepEqual(await lying.outputs(), []);
});

test("history fallback skips screenshot API responses, scans a copied image file, and guards automatic copy", async () => {
  const files = await historyFiles();
  const wrapper = await harness({
    // Clipboard.read returns no file for screenshot image representations, even though Raycast retains the image.
    history: [{ text: "copied text" }, { text: "" }, { text: "shot.png", file: files["shot.png"] }],
    native: async (args, operation) => {
      if (operation === "copyRedactedImage") return;
      if (args[7] === null) throw noImage();
      await writeFile(args[0], png);
      return { hits: [hit], regionCount: 1, output: args[0], clipboardChangeCount: null };
    },
  });
  const scan = await wrapper.redactClipboard({ fallbackToHistory: true, guardClipboard: true });
  assert.equal(scan.source.kind, "history");
  assert.equal(scan.source.offset, 2);
  assert.equal(wrapper.calls[1].args[7], files["shot.png"]);
  assert.equal(scan.clipboardChangeCount, 17);
  await wrapper.copyRedacted(scan, { requireOriginalClipboard: true });
  assert.deepEqual(Array.from(wrapper.calls.at(-1).args), [scan.output, 17]);
  await wrapper.disposeScan(scan);
  assert.deepEqual(await wrapper.outputs(), []);
});

test("history fallback only handles a missing clipboard image", async () => {
  const files = await historyFiles();
  const history = [{ text: "shot.png", file: files["shot.png"] }];
  const empty = await harness({
    native: async () => {
      throw noImage();
    },
  });
  await assert.rejects(empty.redactClipboard({ fallbackToHistory: true }), /recent history has no copied image files/);
  await assert.rejects(empty.redactClipboard(), /^Error: Clipboard has no image\. Copy a screenshot first\.$/);
  const failing = await harness({
    history,
    native: async () => {
      throw Object.assign(new Error("process failed"), { stderr: "Invalid Custom Regex." });
    },
  });
  await assert.rejects(failing.redactClipboard({ fallbackToHistory: true }), /Invalid Custom Regex/);
  assert.equal(failing.calls.length, 1);
  assert.deepEqual(await failing.outputs(), []);
});

test("screenshot-only history explains the API limitation and how to scan the screenshot", async () => {
  const wrapper = await harness({
    history: [{ text: "" }, { text: "" }],
    native: async () => {
      throw noImage();
    },
  });
  assert.deepEqual(Array.from(await wrapper.clipboardHistoryImageFiles()), []);
  await assert.rejects(wrapper.redactClipboard({ fallbackToHistory: true }), (error) => {
    assert.match(error.message, /Screenshot history is unavailable/);
    assert.match(error.message, /Copy a screenshot again or copy an image file/);
    return true;
  });
  assert.deepEqual(await wrapper.outputs(), []);
});

test("exclusions use scan-scoped identities and copy only the latest successful render", async () => {
  const wrapper = await harness();
  const first = await wrapper.redactClipboard({ forReview: true });
  const id = first.hits[0].id;
  assert.deepEqual(Array.from(first.excludedIds), []);
  const excluded = await wrapper.updateRedactions(first, [id]);
  assert.equal(excluded.regionCount, 0);
  assert.equal(excluded.hits[0].id, id);
  assert.notEqual(excluded.output, first.output);
  assert.equal(wrapper.calls.filter((call) => call.operation === "redactImage").length, 1);
  assert.deepEqual(JSON.parse(wrapper.calls.at(-1).args[2]), []);
  await assert.rejects(wrapper.copyRedacted(first), /expired/);
  await wrapper.copyRedacted(excluded);
  assert.equal(wrapper.calls.at(-1).args[0], excluded.output);
  const restored = await wrapper.updateRedactions(excluded, []);
  assert.equal(restored.regionCount, 1);
  assert.deepEqual(JSON.parse(wrapper.calls.at(-1).args[2]), [{ kind: hit.kind, box: hit.box }]);
  const second = await wrapper.redactClipboard({ forReview: true });
  assert.notEqual(second.hits[0].id, id, "a new scan never inherits an exclusion");
  await assert.rejects(wrapper.updateRedactions(second, [id]), /different scan/);
  await wrapper.disposeScan(restored);
  await wrapper.disposeScan(second);
  assert.deepEqual(await wrapper.outputs(), []);
});

test("excluding one of overlapping detections keeps other categories masked", async () => {
  const wrapper = await harness({
    native: async (args, operation) => {
      if (operation === "updateReviewImage") {
        await writeFile(args[4], png);
        return new Set(JSON.parse(args[2]).map((mask) => JSON.stringify(mask.box))).size;
      }
      await writeFile(args[0], png);
      return {
        hits: [hit, { ...hit, kind: "custom" }, { ...hit, box: { ...hit.box, y: 50 } }],
        regionCount: 2,
        output: args[0],
        clipboardChangeCount: 17,
      };
    },
  });
  const scan = await wrapper.redactClipboard({ forReview: true });
  assert.equal(new Set(scan.hits.map((hit) => hit.id)).size, 3);
  const excludedId = scan.hits[0].id;
  scan.hits.reverse(); // Sorting the review must not change which detection an ID refers to.
  const excluded = await wrapper.updateRedactions(scan, [excludedId]);
  assert.equal(excluded.regionCount, 2);
  assert.deepEqual(JSON.parse(wrapper.calls.at(-1).args[2]), [
    { kind: hit.kind, box: { ...hit.box, y: 50 } },
    { kind: "custom", box: hit.box },
  ]);
  await wrapper.disposeScan(excluded);
});

test("pending renders block copying and edits; closing waits for cleanup without publishing", async () => {
  let finish;
  const gate = new Promise((resolve) => {
    finish = resolve;
  });
  const wrapper = await harness({
    native: async (args, operation) => {
      if (operation === "updateReviewImage") {
        await gate;
        await writeFile(args[4], png);
        return 0;
      }
      await writeFile(args[0], png);
      return { hits: [hit], regionCount: 1, output: args[0], clipboardChangeCount: 17 };
    },
  });
  const scan = await wrapper.redactClipboard({ forReview: true });
  const updating = wrapper.updateRedactions(scan, [scan.hits[0].id]);
  await assert.rejects(wrapper.copyRedacted(scan), /updating/);
  await assert.rejects(wrapper.updateRedactions(scan, []), /updating/);
  const closing = wrapper.disposeScan(scan);
  finish();
  await assert.rejects(updating, /expired/);
  await closing;
  assert.deepEqual(await wrapper.outputs(), []);
});

test("failed or invalid render retains the previous selection and allows retry", async () => {
  let behavior = "failure";
  const wrapper = await harness({
    native: async (args, operation) => {
      if (operation === "updateReviewImage") {
        await writeFile(args[4], png);
        if (behavior === "failure") throw new Error("synthetic render failure");
        return behavior === "count" ? 1 : 0;
      }
      await writeFile(args[0], png);
      return { hits: [hit], regionCount: 1, output: args[0], clipboardChangeCount: 17 };
    },
  });
  const scan = await wrapper.redactClipboard({ forReview: true });
  for (const value of ["failure", "count"]) {
    behavior = value;
    await assert.rejects(wrapper.updateRedactions(scan, [scan.hits[0].id]));
    assert.deepEqual(Array.from(scan.excludedIds), []);
    await access(scan.output);
    assert.deepEqual(await readdir(path.dirname(scan.output)), ["out.png"]);
  }
  behavior = "success";
  const next = await wrapper.updateRedactions(scan, [scan.hits[0].id]);
  assert.equal(next.regionCount, 0);
  await wrapper.disposeScan(next);
});

test("edits and closing preserve output until every already-started copy finishes", async () => {
  for (const close of [false, true]) {
    const readers = [];
    const wrapper = await harness({
      native: async (args, operation) => {
        if (operation === "copyRedactedImage") {
          await new Promise((resolve) => {
            readers.push(resolve);
          });
          await access(args[0]); // Model a native process that only opens the file after spawning.
          return;
        }
        if (operation === "updateReviewImage") {
          await writeFile(args[4], png);
          return 0;
        }
        await writeFile(args[0], png);
        return { hits: [hit], regionCount: 1, output: args[0], clipboardChangeCount: 17 };
      },
    });
    const scan = await wrapper.redactClipboard({ forReview: true });
    const firstCopy = wrapper.copyRedacted(scan);
    const secondCopy = wrapper.copyRedacted(scan);
    let finished = false;
    const pending = (close ? wrapper.disposeScan(scan) : wrapper.updateRedactions(scan, [scan.hits[0].id])).then(
      (result) => {
        finished = true;
        return result;
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 30));
    assert.equal(finished, false);
    await access(scan.output);
    readers[0]();
    await firstCopy;
    assert.equal(finished, false, "the second copy also owns the old output");
    readers[1]();
    await secondCopy;
    const result = await pending;
    await absent(scan.output);
    if (!close) {
      assert.equal(result.regionCount, 0);
      await wrapper.disposeScan(result);
    }
    assert.deepEqual(await wrapper.outputs(), []);
  }
});

for (const blurFaces of [undefined, false, true]) {
  test(`macOS scan and review preserve face blur preference ${blurFaces}`, async () => {
    const preferences = { style: "pixelate", blurFaces };
    const wrapper = await harness({ preferences });
    const scan = await wrapper.redactClipboard({ forReview: true });
    assert.equal(wrapper.calls.at(-1).args[9], blurFaces ?? false);
    preferences.blurFaces = !blurFaces;
    const updated = await wrapper.updateRedactions(scan, []);
    assert.equal(wrapper.calls.at(-1).args[3], "pixelate");
    assert.equal(wrapper.calls.at(-1).args[5], blurFaces ?? false, "review keeps the scan's preference");
    assert.deepEqual(JSON.parse(wrapper.calls.at(-1).args[2]), [{ kind: hit.kind, box: hit.box }]);
    await wrapper.disposeScan(updated);
  });
}
