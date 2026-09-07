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

test("native outcomes preserve real Error-prefixed text and reject malformed responses", () => {
  const host = createHost();
  const { parseOutcome } = host.load("src/ocr/macos.ts");
  for (const outcome of [
    { status: "recognized", text: "Error: this is real OCR\n日本語" },
    { status: "no-text" },
    { status: "cancelled" },
    { status: "error", message: "Capture denied" },
  ])
    assert.deepEqual(parseOutcome(JSON.stringify(outcome)), outcome);
  for (const raw of [
    "diagnostic output",
    "null",
    "[]",
    "{}",
    '{"status":"unknown"}',
    '{"status":"recognized","text":""}',
    '{"status":"recognized","text":"  "}',
    '{"status":"recognized","text":42}',
    '{"status":"recognized","text":"ok","extra":true}',
    '{"status":"error","message":null}',
    '{"status":"cancelled","text":"stale"}',
  ])
    assert.equal(parseOutcome(raw).status, "error", raw);
  assert.equal(
    host.imports.some((name) => name.startsWith("swift:")),
    false,
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

test("macOS clipboard recognition preserves selected languages and avoids PowerShell", async () => {
  const host = createHost({
    platform: "darwin",
    storage: { SelectedLanguages: '[{"title":"French","value":"fr-FR"}]' },
  });
  await host.load("src/recognize-clipboard.ts").default();
  assert.equal(
    host.calls.some(([name]) => name === "process"),
    false,
  );
  const swift = host.calls.find(([name]) => name === "swift");
  assert.equal(swift[1], "recognizeClipboardText");
  assert.deepEqual(swift[2].at(-1), ["fr-FR", "en-US"]);
});

test("barcode stays copy-only on macOS and never loads Swift on Windows", async () => {
  const mac = createHost({
    platform: "darwin",
    preferences: { resultAction: "both" },
  });
  await mac.load("src/detect-barcode.tsx").default();
  assert.deepEqual(
    outputs(mac).map(([name]) => name),
    ["copy"],
  );
  const win = createHost();
  await win.load("src/detect-barcode.tsx").default();
  assert.deepEqual(outputs(win), []);
  assert.equal(
    win.imports.some((name) => name.startsWith("swift:")),
    false,
  );
  assert.match(win.calls.at(-1)[1], /only on macOS/);
});
