const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const ts = require("typescript");

// Execute the actual TypeScript modules with only host APIs replaced. Each test
// has an isolated module cache, platform and clipboard; no Raycast host is used.
function createHost(options = {}) {
  const calls = [];
  const storage = new Map(Object.entries(options.storage ?? {}));
  const preferences = {
    primaryLanguage: "en-US",
    ocrMode: "accurate",
    languageCorrection: true,
    ignoreLineBreaks: false,
    keepImage: false,
    playSound: true,
    showToast: true,
    resultAction: "copy",
    ...options.preferences,
  };
  const api = {
    environment: { assetsPath: "C:\\Raycast Data\\ScreenOCR\\assets" },
    getPreferenceValues: () => preferences,
    closeMainWindow: async () => {
      calls.push(["close"]);
      if (options.closeError) throw options.closeError;
    },
    Clipboard: {
      copy: async (text) => {
        calls.push(["copy", text]);
        if (options.copyError) throw options.copyError;
      },
      paste: async (text) => {
        calls.push(["paste", text]);
        if (options.pasteError) throw options.pasteError;
      },
    },
    LocalStorage: {
      getItem: async (key) => storage.get(key),
      setItem: async (key, value) => storage.set(key, value),
    },
    Toast: { Style: { Success: "success", Failure: "failure" } },
    showToast: async (value) => calls.push(["toast", value]),
  };
  const overrides = {
    "@raycast/api": api,
    "@raycast/utils": {
      showFailureToast: async (error, details) =>
        calls.push(["failure", error, details]),
    },
    "raycast-cross-extension": {
      callbackLaunchCommand: async (callbackOptions, result) => {
        calls.push(["callback", callbackOptions, result]);
        if (options.callbackError) throw options.callbackError;
      },
    },
    "node:child_process": {
      execFile: (executable, args, settings, callback) => {
        calls.push(["process", executable, args, settings]);
        callback(
          options.processError ?? null,
          options.stdout ?? '{"status":"recognized","text":"Example text"}',
          options.stderr ?? "",
        );
      },
    },
    "swift:../../swift": Object.fromEntries(
      ["recognizeText", "recognizeClipboardText", "detectBarcode"].map(
        (name) => [
          name,
          async (...args) => {
            calls.push(["swift", name, args]);
            return (
              options.swiftResult ??
              '{"status":"recognized","text":"Example text"}'
            );
          },
        ],
      ),
    ),
  };
  const fakeProcess = Object.create(process);
  Object.defineProperty(fakeProcess, "platform", {
    value: options.platform ?? "win32",
  });
  const cache = new Map();
  const imports = [];
  const root = path.resolve(__dirname, "..");
  function load(relativePath) {
    const filename = path.resolve(root, relativePath);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const realRequire = createRequire(filename);
    const scopedRequire = (specifier) => {
      imports.push(specifier);
      if (Object.hasOwn(overrides, specifier)) return overrides[specifier];
      if (specifier.startsWith(".")) {
        const resolved = path.resolve(path.dirname(filename), specifier);
        const candidate = [resolved, `${resolved}.ts`, `${resolved}.tsx`].find(
          (file) => fs.existsSync(file) && fs.statSync(file).isFile(),
        );
        if (candidate) return load(candidate);
      }
      return realRequire(specifier);
    };
    const { outputText } = ts.transpileModule(
      fs.readFileSync(filename, "utf8"),
      {
        fileName: filename,
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.CommonJS,
          esModuleInterop: true,
          jsx: ts.JsxEmit.ReactJSX,
        },
      },
    );
    new Function("require", "module", "exports", "process", outputText)(
      scopedRequire,
      module,
      module.exports,
      fakeProcess,
    );
    return module.exports;
  }
  return { load, calls, imports, storage, preferences };
}

module.exports = { createHost };
