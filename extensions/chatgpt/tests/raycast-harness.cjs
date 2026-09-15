const { Worker } = require("node:worker_threads");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { createRequire } = require("node:module");
const { EventEmitter } = require("node:events");
const apiRoot =
  process.env.RAYCAST_API_ROOT ||
  "/Applications/Raycast.app/Contents/Resources/macos-app_RaycastDesktopApp.bundle/Contents/Resources/api";
const available = fs.existsSync(path.join(apiRoot, "node_modules/@raycast/api/index.js"));

async function launch(entry, initialStorage = {}, preferenceOverrides = {}, supportDirectory, launchContext) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "chatgpt-runtime-test-"));
  fs.mkdirSync(path.join(dir, "support"));
  fs.symlinkSync(path.join(apiRoot, "node_modules"), path.join(dir, "node_modules"));
  const sdkRequire = createRequire(require.resolve("@raycast/api/package.json"));
  const esbuild = sdkRequire("esbuild");
  await esbuild.build({
    entryPoints: [path.resolve("src", `${entry}.tsx`)],
    outfile: path.join(dir, "command.cjs"),
    bundle: true,
    platform: "node",
    target: "node22",
    format: "cjs",
    external: ["@raycast/api", "react", "react/jsx-runtime"],
    logLevel: "silent",
  });
  fs.writeFileSync(
    path.join(dir, "worker.cjs"),
    "require('@raycast/api');require('node:worker_threads').parentPort.postMessage({kind:'ready'});\n",
  );
  const worker = new Worker(path.join(dir, "worker.cjs"), {
    env: { ...process.env, NODE_ENV: "test" },
    workerData: { isDevelopment: false, appearance: "light", textSize: "medium", useSystemProxy: false, systemCAs: [] },
  });
  const events = new EventEmitter();
  const storage = new Map(Object.entries(initialStorage));
  const methods = [];
  const alerts = [];
  let tree,
    fault,
    storageWriteError,
    sequence = 0;
  const pending = new Map();
  const request = (method, params) =>
    new Promise((resolve, reject) => {
      const id = `test-${++sequence}`;
      pending.set(id, { resolve, reject });
      worker.postMessage({ kind: "request", id, method, params });
    });
  const ready = new Promise((resolve) => events.once("ready", resolve));
  worker.on("error", (error) => {
    fault = error;
    events.emit("update");
  });
  worker.on("message", async (message) => {
    if (message.kind === "ready") return events.emit("ready");
    if (message.kind === "result") {
      const waiter = pending.get(message.id);
      pending.delete(message.id);
      if (message.result.success) waiter?.resolve(message.result.value);
      else waiter?.reject(new Error(JSON.stringify(message.result.error)));
      return;
    }
    methods.push({ method: message.method, params: message.params });
    let value;
    try {
      const params = message.params;
      switch (message.method) {
        case "render": {
          tree = JSON.parse(params.renderTree).model;
          events.emit("update");
          break;
        }
        case "getLocalStorageItem":
          value = { value: storage.get(params.key) };
          break;
        case "setLocalStorageItem":
          if (storageWriteError) {
            worker.postMessage({
              kind: "result",
              id: message.id,
              result: { success: false, error: { message: storageWriteError } },
            });
            return;
          }
          storage.set(params.key, params.value);
          break;
        case "showToast":
          value = { id: "test-toast" };
          events.emit("update");
          break;
        case "getFrontmostApplication":
          value = { name: "Fixture App", path: "/fixture.app", bundleId: "test.fixture" };
          break;
        case "getSelectedText":
          value = { text: "Text to rewrite" };
          break;
        case "getSelectedFinderItems":
          value = { items: [] };
          break;
        case "clipboardRead":
          value = { text: "", file: undefined };
          break;
        case "showAlert":
          alerts.push(params);
          events.emit("update");
          break;
        case "commandException":
          throw new Error(JSON.stringify(params));
        case "renderEmpty":
        case "renderSuspense":
        case "updateToast":
        case "clearSearchBar":
        case "formSetFocus":
        case "shakeMainRaycastWindow":
        case "logCommand":
        case "reportUsage":
          break;
        default:
          throw new Error(`Unhandled native bridge method: ${message.method} ${JSON.stringify(params)}`);
      }
      if (message.kind === "request")
        worker.postMessage({ kind: "result", id: message.id, result: { success: true, value } });
    } catch (error) {
      fault = error;
      events.emit("update");
      if (message.kind === "request")
        worker.postMessage({ kind: "result", id: message.id, result: { success: false, error } });
    }
  });
  const waitFor = (predicate, label = "runtime state") =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            `Timed out waiting for ${label}; page: ${tree?.navigationStack?.body?.navigationTitle}; actions: ${tree?.actions?.sections
              .flatMap((s) => s.items)
              .map((a) => a.title)
              .join(", ")}; last methods: ${JSON.stringify(methods.slice(-8).map(({ method }) => method))}`,
          ),
        );
      }, 5000);
      const cleanup = () => {
        clearTimeout(timer);
        events.off("update", check);
      };
      const check = () => {
        if (fault) {
          cleanup();
          reject(fault);
          return;
        }
        const result = tree && predicate(tree);
        if (result) {
          cleanup();
          resolve(result);
        }
      };
      events.on("update", check);
      check();
    });
  const close = async () => {
    await worker.terminate();
    fs.rmSync(dir, { recursive: true, force: true });
  };
  try {
    await ready;
    const preferences = {
      apiKey: "fixture-key",
      useStream: false,
      isAutoSaveConversation: false,
      isHistoryPaused: true,
      isAutoLoadText: false,
      isAutoFullInput: false,
      isAutoTTS: false,
      useProxy: false,
      useAzure: false,
      ...preferenceOverrides,
    };
    await request("initialize", {
      id: "fixture-session",
      entryPointType: "command",
      entryPointMode: "view",
      entryPointName: entry,
      extensionName: "chatgpt-test",
      ownerOrAuthorName: "fixture",
      commandPath: path.join(dir, "command.cjs"),
      assetsPath: path.resolve("assets"),
      supportPath: supportDirectory ?? path.join(dir, "support"),
      launchType: "userInitiated",
      launchContext: launchContext ? JSON.stringify(launchContext) : undefined,
      preferences: Object.fromEntries(Object.entries(preferences).map(([key, value]) => [key, { value }])),
    });
    return {
      waitFor,
      request,
      storage,
      methods,
      alerts,
      failStorageWrites: (message) => {
        storageWriteError = message;
      },
      get tree() {
        return tree;
      },
      close,
      callback: (callbackId, data) => request("nativeCallback", { callbackId, data }),
    };
  } catch (error) {
    await close();
    throw error;
  }
}
module.exports = { launch, available };
