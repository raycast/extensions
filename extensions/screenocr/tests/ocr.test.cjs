const assert = require("node:assert/strict");
const test = require("node:test");
const { createHost } = require("./helpers.cjs");

const callbackOptions = {
  name: "caller",
  extensionName: "example",
  ownerOrAuthorName: "example",
};
const outputs = (host) =>
  host.calls.filter(([name]) => ["copy", "paste"].includes(name));

test("Windows preserves Unicode and real Error-prefixed OCR text", async () => {
  const text = "Error: this is real OCR\n日本語";
  const host = createHost({
    stdout: JSON.stringify({ status: "recognized", text }),
  });
  assert.deepEqual(
    await host.load("src/ocr/windows.ts").recognizeWindows("clipboard"),
    { status: "recognized", text },
  );
});

for (const [outcome, expected] of [
  [{ status: "recognized", text: "Result" }, { text: "Result" }],
  [{ status: "no-text" }, { text: null, error: "No text detected" }],
  [{ status: "cancelled" }, { text: null, error: "Recognition cancelled" }],
  [
    { status: "error", message: "No OCR pack" },
    { text: null, error: "No OCR pack" },
  ],
]) {
  test(`callback ${outcome.status} skips ordinary clipboard actions`, async () => {
    const host = createHost({ preferences: { resultAction: "both" } });
    await host
      .load("src/ocr/result.ts")
      .handleRecognitionOutcome(outcome, { callbackOptions });
    assert.deepEqual(host.calls, [["callback", callbackOptions, expected]]);
  });
}

test("failed callback delivery is reported and never retried", async () => {
  const host = createHost({ callbackError: new Error("Caller unavailable") });
  await host
    .load("src/recognize-text.tsx")
    .default({ launchContext: { callbackLaunchOptions: callbackOptions } });
  assert.equal(host.calls.filter(([name]) => name === "callback").length, 1);
  assert.equal(host.calls.filter(([name]) => name === "failure").length, 1);
  assert.deepEqual(outputs(host), []);
});

test("window-close failures reach a callback once without running recognition", async () => {
  const host = createHost({ closeError: new Error("Unable to close") });
  await host
    .load("src/recognize-text.tsx")
    .default({ launchContext: { callbackLaunchOptions: callbackOptions } });
  assert.deepEqual(host.calls, [
    ["close"],
    ["callback", callbackOptions, { text: null, error: "Unable to close" }],
  ]);
});

test("ordinary cancellation has no output or notification", async () => {
  const host = createHost();
  await host
    .load("src/ocr/result.ts")
    .handleRecognitionOutcome({ status: "cancelled" });
  assert.deepEqual(host.calls, []);
});

for (const [action, expected] of [
  ["copy", ["copy"]],
  ["paste", ["paste"]],
  ["both", ["copy", "paste"]],
  [undefined, ["copy"]],
  ["invalid", ["copy"]],
]) {
  test(`ordinary result action ${action} has bounded clipboard effects`, async () => {
    const host = createHost({ preferences: { resultAction: action } });
    await host
      .load("src/ocr/result.ts")
      .handleRecognitionOutcome({ status: "recognized", text: "Text" });
    assert.deepEqual(
      outputs(host).map(([name]) => name),
      expected,
    );
    assert.equal(host.calls.filter(([name]) => name === "toast").length, 1);
  });
}

test("copy-and-paste reports partial failure without claiming success", async () => {
  const host = createHost({
    preferences: { resultAction: "both" },
    pasteError: new Error("Paste denied"),
  });
  await host
    .load("src/ocr/result.ts")
    .handleRecognitionOutcome({ status: "recognized", text: "Text" });
  assert.deepEqual(
    outputs(host).map(([name]) => name),
    ["copy", "paste"],
  );
  assert.equal(
    host.calls.some(([name]) => name === "toast"),
    false,
  );
  assert.equal(
    host.calls.at(-1)[2].title,
    "Text was copied, but could not be pasted",
  );
});

test("failed copy prevents the paste half of copy-and-paste", async () => {
  const host = createHost({
    preferences: { resultAction: "both" },
    copyError: new Error("Busy clipboard"),
  });
  await host
    .load("src/ocr/result.ts")
    .handleRecognitionOutcome({ status: "recognized", text: "Text" });
  assert.deepEqual(
    outputs(host).map(([name]) => name),
    ["copy"],
  );
});

test("disabled notifications suppress result messages without changing clipboard actions", async () => {
  const host = createHost({ preferences: { showToast: false } });
  const { handleRecognitionOutcome } = host.load("src/ocr/result.ts");
  await handleRecognitionOutcome({ status: "recognized", text: "Text" });
  await handleRecognitionOutcome({ status: "no-text" });
  await handleRecognitionOutcome({ status: "error", message: "Failure" });
  assert.deepEqual(host.calls, [["copy", "Text"]]);
});

for (const [entry, mode] of [
  ["src/recognize-text.tsx", "area"],
  ["src/recognize-text-fullscreen.ts", "fullscreen"],
  ["src/recognize-clipboard.ts", "clipboard"],
]) {
  test(`${mode} command invokes Windows without initializing Swift`, async () => {
    const host = createHost();
    await host.load(entry).default({});
    const processCall = host.calls.find(([name]) => name === "process");
    const args = processCall[2];
    assert.equal(args[args.indexOf("-Mode") + 1], mode);
    assert.equal(
      host.imports.some((name) => name.startsWith("swift:")),
      false,
    );
    assert.deepEqual(outputs(host), [["copy", "Example text"]]);
  });
}

test("Windows process uses an absolute executable, safe argument array and bounded execution", async () => {
  const host = createHost({
    storage: { WindowsRecognitionLanguage: "ja-JP" },
    preferences: { ignoreLineBreaks: true },
  });
  await host.load("src/ocr/windows.ts").recognizeWindows("area");
  const [, executable, args, settings] = host.calls[0];
  assert.match(
    executable,
    /^[A-Za-z]:\\.*\\WindowsPowerShell\\v1\.0\\powershell\.exe$/,
  );
  for (const arg of ["-NoProfile", "-STA", "-File", "-IgnoreLineBreaks"])
    assert.ok(args.includes(arg));
  assert.equal(args[args.indexOf("-ExecutionPolicy") + 1], "Bypass");
  assert.equal(args[args.indexOf("-Language") + 1], "ja-JP");
  assert.equal(settings.shell, undefined);
  assert.equal(settings.windowsHide, true);
  assert.equal(settings.encoding, "utf8");
  assert.ok(settings.timeout > 0 && settings.timeout <= 300_000);
  assert.ok(settings.maxBuffer > 0 && settings.maxBuffer <= 16 * 1024 * 1024);
});

for (const stdout of [
  "",
  'noise\n{"status":"recognized","text":"secret"}',
  "null",
  "[]",
  '{"status":"recognized","text":""}',
  '{"status":"recognized","text":"  "}',
  '{"status":"recognized","text":"secret","extra":true}',
  '{"status":"no-text","text":"stale"}',
]) {
  test(`Windows rejects invalid helper output ${JSON.stringify(stdout)}`, async () => {
    const host = createHost({ stdout });
    const outcome = await host
      .load("src/ocr/windows.ts")
      .recognizeWindows("clipboard");
    assert.equal(outcome.status, "error");
    assert.equal(outcome.message.includes("secret"), false);
  });
}

for (const [error, stdout, status, message] of [
  [{ code: 2 }, "", "cancelled", undefined],
  [{ code: 3 }, "", "error", /ja-JP.*not installed/],
  [
    { code: 4 },
    '{"status":"error","code":"clipboard-corrupt"}',
    "error",
    /could not be decoded/,
  ],
  [
    { code: 4 },
    '{"status":"error","code":"clipboard-unsupported"}',
    "error",
    /not a supported image/,
  ],
  [
    { code: 4 },
    '{"status":"error","code":"clipboard-busy"}',
    "error",
    /clipboard is busy/,
  ],
  [
    { code: 4 },
    '{"status":"error","code":"__proto__"}',
    "error",
    /supported image/,
  ],
  [
    { code: 4 },
    '{"status":"error","code":"clipboard-too-large"}',
    "error",
    /too large/,
  ],
  [
    { code: 4 },
    '{"status":"error","code":"clipboard-unreadable"}',
    "error",
    /could not be read/,
  ],
  [
    { code: 6 },
    "",
    "error",
    /Another Windows screen capture is already in progress.*cancel it.*try again/,
  ],
  [{ code: "ENOENT" }, "", "error", /PowerShell 5.1/],
  [{ killed: true, signal: "SIGTERM" }, "", "error", /timed out/],
  [
    { code: "ERR_CHILD_PROCESS_STDIO_MAXBUFFER", killed: true },
    "",
    "error",
    /size limit/,
  ],
  [{ code: 5 }, "", "error", /recognition failed/],
]) {
  test(`Windows maps process outcome ${JSON.stringify(error)} safely`, async () => {
    const host = createHost({
      processError: error,
      stdout,
      storage: { WindowsRecognitionLanguage: "ja-JP" },
    });
    const outcome = await host
      .load("src/ocr/windows.ts")
      .recognizeWindows("area");
    assert.equal(outcome.status, status);
    if (message) assert.match(outcome.message, message);
  });
}

test("invalid saved language is rejected before PowerShell instead of falling back", async () => {
  const host = createHost({
    storage: { WindowsRecognitionLanguage: "ja-JP; Write-Output bad" },
  });
  const outcome = await host
    .load("src/ocr/windows.ts")
    .recognizeWindows("area");
  assert.equal(outcome.status, "error");
  assert.equal(host.calls.length, 0);
});

test("Windows language selection and inventory preserve macOS selections", async () => {
  const savedMacLanguages = '[{"value":"fr-FR","title":"French"}]';
  const host = createHost({
    storage: { SelectedLanguages: savedMacLanguages },
    stdout:
      '{"status":"languages","languages":[{"tag":"ja-JP","displayName":"Japanese"}]}',
  });
  const windows = host.load("src/ocr/windows.ts");
  assert.equal(await windows.getWindowsRecognitionLanguage(), "auto");
  assert.deepEqual(await windows.getAvailableWindowsLanguages(), [
    { tag: "ja-JP", displayName: "Japanese" },
  ]);
  await windows.setWindowsRecognitionLanguage("ja-JP");
  assert.equal(await windows.getWindowsRecognitionLanguage(), "ja-JP");
  assert.equal(host.storage.get("SelectedLanguages"), savedMacLanguages);
  await assert.rejects(windows.setWindowsRecognitionLanguage("--invalid"));
});

for (const entry of [
  "src/recognize-text.tsx",
  "src/recognize-text-fullscreen.ts",
  "src/detect-barcode.tsx",
]) {
  test(`${entry} retains macOS copy behavior and never invokes PowerShell`, async () => {
    const mac = createHost({
      platform: "darwin",
      preferences: { resultAction: "both" },
    });
    await mac.load(entry).default({});
    assert.deepEqual(outputs(mac), [["copy", "Example text"]]);
    assert.equal(
      mac.calls.some(([name]) => name === "process"),
      false,
    );
  });
}

test("macOS OCR retains selected languages and the original raw Swift contract", async () => {
  const mac = createHost({
    platform: "darwin",
    storage: { SelectedLanguages: '[{"title":"French","value":"fr-FR"}]' },
    swiftResult: "Known text",
  });
  await mac
    .load("src/recognize-text.tsx")
    .default({ launchContext: { callbackLaunchOptions: callbackOptions } });
  const swift = mac.calls.find(([name]) => name === "swift");
  assert.equal(swift[1], "recognizeText");
  assert.deepEqual(swift[2][6], ["fr-FR", "en-US"]);
  assert.deepEqual(outputs(mac), []);
  assert.deepEqual(
    mac.calls.find(([name]) => name === "callback"),
    ["callback", callbackOptions, { text: "Known text" }],
  );
});

const swiftCalls = (host) =>
  host.calls.filter(([name]) => name === "swift").map(([, name]) => name);

test("clipboard command recognizes on macOS and copies by default", async () => {
  const mac = createHost({
    platform: "darwin",
    storage: { SelectedLanguages: '[{"title":"French","value":"fr-FR"}]' },
    swiftResult: "Clipboard text",
  });
  await mac.load("src/recognize-clipboard.ts").default();
  assert.deepEqual(outputs(mac), [["copy", "Clipboard text"]]);
  assert.deepEqual(swiftCalls(mac), ["recognizeClipboard"]);
  const swift = mac.calls.find(([name]) => name === "swift");
  assert.deepEqual(swift[2][4], ["fr-FR", "en-US"]);
  assert.equal(
    mac.calls.some(([name]) => name === "process"),
    false,
  );
});

test("clipboard command shows animated progress then the result toast", async () => {
  const mac = createHost({ platform: "darwin", swiftResult: "Clipboard text" });
  await mac.load("src/recognize-clipboard.ts").default();
  const toasts = mac.calls
    .filter(([name]) => name === "toast")
    .map(([, value]) => value);
  assert.deepEqual(toasts, [
    { style: "animated", title: "Recognizing…" },
    { style: "success", title: "Copied text to clipboard" },
  ]);
  assert.equal(mac.calls.filter(([name]) => name === "toast-hide").length, 1);
  assert.equal(
    mac.calls.findIndex(([name]) => name === "toast-hide") <
      mac.calls.findIndex(([name]) => name === "copy"),
    true,
  );
});

test("clipboard progress toast is skipped when toasts are disabled", async () => {
  const mac = createHost({
    platform: "darwin",
    preferences: { showToast: false },
    swiftResult: "Clipboard text",
  });
  await mac.load("src/recognize-clipboard.ts").default();
  assert.equal(
    mac.calls.some(([name]) => name === "toast"),
    false,
  );
  assert.deepEqual(outputs(mac), [["copy", "Clipboard text"]]);
});

test("clipboard recognition times out with an actionable error and no result", async () => {
  const mac = createHost({ platform: "darwin", swiftHanging: true });
  const { recognizeClipboard } = mac.load("src/ocr/macos.ts");
  const outcome = await recognizeClipboard(20);
  assert.equal(outcome.status, "error");
  assert.match(outcome.message, /timed out/i);
  assert.match(outcome.message, /try again/i);
});

test("clipboard paste-restore snapshots, pastes, then restores the clipboard", async () => {
  const mac = createHost({
    platform: "darwin",
    preferences: { clipboardResultAction: "paste-restore" },
    swiftResult: "Clipboard text",
  });
  await mac.load("src/recognize-clipboard.ts").default();
  assert.deepEqual(outputs(mac), [["paste", "Clipboard text"]]);
  assert.deepEqual(
    mac.calls
      .filter(([name]) => ["swift", "paste"].includes(name))
      .map(([name, detail]) => (name === "swift" ? detail : name)),
    ["recognizeClipboard", "snapshotClipboard", "paste", "restoreClipboard"],
  );
  assert.deepEqual(
    mac.calls.find(([, name]) => name === "restoreClipboard")[2],
    ["snapshot-id"],
  );
});

test("clipboard paste-restore does not paste when the snapshot fails", async () => {
  const mac = createHost({
    platform: "darwin",
    preferences: { clipboardResultAction: "paste-restore" },
    swiftResults: {
      recognizeClipboard: "Text",
      snapshotClipboard: "Error: disk full",
    },
  });
  await mac.load("src/recognize-clipboard.ts").default();
  assert.deepEqual(outputs(mac), []);
  assert.equal(
    mac.calls.some(([name]) => name === "failure"),
    true,
  );
  assert.equal(swiftCalls(mac).includes("restoreClipboard"), false);
});

test("clipboard paste-restore restores the clipboard when pasting fails", async () => {
  const mac = createHost({
    platform: "darwin",
    preferences: { clipboardResultAction: "paste-restore" },
    pasteError: new Error("No app"),
    swiftResults: { recognizeClipboard: "Text" },
  });
  await mac.load("src/recognize-clipboard.ts").default();
  assert.equal(swiftCalls(mac).at(-1), "restoreClipboard");
  assert.equal(
    mac.calls.some(([name]) => name === "failure"),
    true,
  );
});

test("clipboard command returns macOS results to a callback without pasting", async () => {
  const mac = createHost({
    platform: "darwin",
    preferences: { clipboardResultAction: "paste-restore" },
    swiftResult: "Clipboard text",
  });
  await mac
    .load("src/recognize-clipboard.ts")
    .default({ launchContext: { callbackLaunchOptions: callbackOptions } });
  assert.deepEqual(outputs(mac), []);
  assert.deepEqual(swiftCalls(mac), ["recognizeClipboard"]);
  assert.equal(
    mac.calls.some(([name]) => name === "toast"),
    false,
  );
  assert.deepEqual(
    mac.calls.find(([name]) => name === "callback"),
    ["callback", callbackOptions, { text: "Clipboard text" }],
  );
});

for (const [swiftResult, entry] of [
  ["Error: cancelled", "src/recognize-text.tsx"],
  ["Error: cancelled", "src/recognize-text-fullscreen.ts"],
  ["Error: cancelled", "src/detect-barcode.tsx"],
]) {
  test(`${entry} treats a cancelled macOS capture silently`, async () => {
    const mac = createHost({ platform: "darwin", swiftResult });
    await mac.load(entry).default({});
    assert.deepEqual(
      mac.calls.filter(([name]) => name !== "swift" && name !== "close"),
      [],
    );
  });
}

test("macOS Swift errors are failures and never copied as text", async () => {
  const mac = createHost({
    platform: "darwin",
    swiftResult: "Error: failed to capture image",
  });
  await mac.load("src/recognize-text.tsx").default({});
  assert.deepEqual(outputs(mac), []);
  assert.equal(
    mac.calls.find(([name]) => name === "failure")[1],
    "failed to capture image",
  );
});

test("macOS cancellation reaches a callback as cancelled", async () => {
  const mac = createHost({
    platform: "darwin",
    swiftResult: "Error: cancelled",
  });
  await mac
    .load("src/recognize-text.tsx")
    .default({ launchContext: { callbackLaunchOptions: callbackOptions } });
  assert.deepEqual(
    mac.calls.find(([name]) => name === "callback"),
    [
      "callback",
      callbackOptions,
      { text: null, error: "Recognition cancelled" },
    ],
  );
});

test("macOS barcode sentinel is no-text with its own title", async () => {
  const mac = createHost({
    platform: "darwin",
    swiftResult: "No barcodes or QR codes detected",
  });
  await mac.load("src/detect-barcode.tsx").default();
  assert.deepEqual(outputs(mac), []);
  assert.equal(
    mac.calls.find(([name]) => name === "failure")[1],
    "No barcodes or QR codes detected",
  );
});

test("parseSwiftResult maps Swift strings to outcomes", () => {
  const { parseSwiftResult } = createHost().load("src/ocr/swift-result.ts");
  assert.deepEqual(parseSwiftResult("Error: boom"), {
    status: "error",
    message: "boom",
  });
  assert.deepEqual(parseSwiftResult("Error: cancelled"), {
    status: "cancelled",
  });
  assert.deepEqual(parseSwiftResult(""), { status: "no-text" });
  assert.deepEqual(parseSwiftResult("  \n "), { status: "no-text" });
  assert.deepEqual(parseSwiftResult(undefined), { status: "no-text" });
  assert.deepEqual(parseSwiftResult("Hello\nError: inside"), {
    status: "recognized",
    text: "Hello\nError: inside",
  });
  assert.deepEqual(parseSwiftResult("No barcodes or QR codes detected"), {
    status: "recognized",
    text: "No barcodes or QR codes detected",
  });
  assert.deepEqual(
    parseSwiftResult("No barcodes or QR codes detected", { barcode: true }),
    { status: "no-text" },
  );
});

test("barcode reports macOS limitation on Windows without loading Swift", async () => {
  const win = createHost();
  await win.load("src/detect-barcode.tsx").default();
  assert.deepEqual(outputs(win), []);
  assert.equal(
    win.imports.some((name) => name.startsWith("swift:")),
    false,
  );
  assert.match(win.calls.at(-1)[1], /only on macOS/);
});
