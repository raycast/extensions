// Run with: node scripts/check-regressions.cjs
// Uses real React and Raycast hooks; native APIs use isolated in-memory storage.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { act } = React;
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><div id='root'></div>");
global.window = dom.window;
global.document = dom.window.document;
const { createRoot } = require("react-dom/client");
global.IS_REACT_ACT_ENVIRONMENT = true;

async function main() {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "project-folders-check-"));
  const root = path.join(temp, "projects");
  const supportPath = path.join(temp, "support");
  const projectPath = path.join(root, "2026", "0907_Test");
  const gid = "1234567890123";
  const url = `https://app.asana.com/task/${gid}`;
  const storage = new Map();
  const caches = [];
  const pushed = [];
  let failWrite = false;
  class Cache {
    data = new Map();
    listeners = new Set();
    constructor() {
      caches.push(this);
    }
    get = (key) => this.data.get(key);
    set = (key, value) => {
      this.data.set(key, value);
      this.listeners.forEach((fn) => fn());
    };
    subscribe = (fn) => {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    };
  }
  // Render native Raycast controls as DOM nodes. React and useCachedPromise stay untouched.
  const component = (name) => (props) =>
    React.createElement(
      "div",
      {
        "data-component": name,
        "data-loading": props.isLoading,
        "data-title": props.title,
        onClick: name === "Action" ? props.onAction : undefined,
      },
      props.children,
      props.actions,
    );
  const api = {
    Cache,
    environment: { supportPath, launchType: "user", assetsPath: path.resolve("assets") },
    LaunchType: { Background: "background" },
    LocalStorage: {
      getItem: async (key) => storage.get(key),
      setItem: async (key, value) => {
        if (failWrite) throw new Error("Storage unavailable");
        storage.set(key, value);
      },
    },
    getPreferenceValues: () => ({ projectsRoot: root }),
    useNavigation: () => ({ push: (screen) => pushed.push(screen) }),
    showToast: async () => {},
    List: Object.assign(component("List"), {
      Item: component("ListItem"),
      Section: component("ListSection"),
      EmptyView: component("EmptyView"),
    }),
    Grid: Object.assign(component("Grid"), {
      Item: component("GridItem"),
      Section: component("GridSection"),
      Inset: {},
    }),
    Action: Object.assign(component("Action"), {
      Push: component("ActionPush"),
      Open: component("ActionOpen"),
      CopyToClipboard: component("ActionCopy"),
    }),
    ActionPanel: Object.assign(component("ActionPanel"), { Section: component("ActionSection") }),
    Icon: {},
    Color: {},
    Toast: { Style: {} },
  };
  const originalLoad = Module._load;
  const originalReadFile = fs.readFile;
  const originalReaddir = fs.readdir;
  const originalExtensions = { ".ts": require.extensions[".ts"], ".tsx": require.extensions[".tsx"] };
  let unreadable = false;
  let scanGate;
  fs.readFile = async (file, ...args) => {
    if (unreadable && path.basename(file) === "Asana.html") {
      throw Object.assign(new Error("Permission denied"), { code: "EACCES" });
    }
    return originalReadFile(file, ...args);
  };
  fs.readdir = async (file, ...args) => {
    if (file === root && scanGate) await scanGate;
    return originalReaddir(file, ...args);
  };
  Module._load = function (name, ...args) {
    if (name === "@raycast/api") return api;
    if (name === "@raycast/utils")
      return {
        ...require("@raycast/utils/dist/useCachedPromise"),
        createDeeplink: () => "raycast://test",
      };
    return originalLoad.call(this, name, ...args);
  };
  for (const extension of [".ts", ".tsx"]) {
    require.extensions[extension] = (module, filename) => {
      module._compile(
        ts.transpileModule(require("node:fs").readFileSync(filename, "utf8"), {
          compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
        }).outputText,
        filename,
      );
    };
  }
  let renderer;
  const container = document.getElementById("root");
  const find = (name) => container.querySelector(`[data-component="${name}"]`);
  const findAll = (name) => [...container.querySelectorAll(`[data-component="${name}"]`)];
  const mount = async (props) => {
    await act(async () => {
      renderer = createRoot(container);
      renderer.render(React.createElement(Command, props));
    });
  };
  let Command;
  const settle = async (condition) => {
    for (let i = 0; i < 100; i++) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      if (condition()) return;
    }
    assert.fail("React did not reach the expected state");
  };
  try {
    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(path.join(projectPath, "Asana.html"), `window.location.href = "${url}"`);
    const { httpsUrl, sanitizeLinks, readLink } = require("../src/links.ts");
    const { buildProjectIndex } = require("../src/projects.ts");
    const { togglePin, prunePins, getPins } = require("../src/pins.ts");
    const { refreshProjectInSnapshot } = require("../src/snapshot.ts");
    Command = require("../src/search-projects.tsx").default;
    for (const unsafe of [
      "/tmp/file",
      "file:///tmp/file",
      "asana://task/123",
      "http://example.com",
      "//example.com",
      "https://",
      "garbage",
    ]) {
      assert.equal(httpsUrl(unsafe), undefined, unsafe);
    }
    assert.equal(httpsUrl(url), url);
    assert.deepEqual(sanitizeLinks({ asana: "file:///tmp/file", drive: "custom:run", frameio: url, gid }), {
      asana: undefined,
      drive: undefined,
      frameio: url,
      gid: undefined,
    });
    assert.equal(await readLink(projectPath, "drive"), undefined);

    for (const pruneFirst of [false, true]) {
      storage.set("pinned-v1", JSON.stringify([projectPath, "/deleted"]));
      const operations = [() => togglePin("/new"), () => prunePins(new Set([projectPath, "/new"]))];
      if (pruneFirst) operations.reverse();
      await Promise.all(operations.map((fn) => fn()));
      assert.deepEqual(await getPins(), ["/new", projectPath], "concurrent pruning must preserve the new pin");
    }
    failWrite = true;
    await assert.rejects(togglePin("/failed"), /Storage unavailable/);
    failWrite = false;
    await togglePin("/after-failure");
    assert.ok((await getPins()).includes("/after-failure"), "a rejected write must not block later writes");
    storage.set("pinned-v1", JSON.stringify([projectPath]));

    unreadable = true;
    await assert.rejects(buildProjectIndex(root), { code: "EACCES" });
    unreadable = false;
    assert.equal((await buildProjectIndex(root)).years[0].projects[0].links.asana, url);
    const snapshotPath = path.join(supportPath, "index.json");
    const before = await fs.readFile(snapshotPath, "utf8");
    unreadable = true;
    await assert.rejects(refreshProjectInSnapshot(root, "2026", "0907_Test"), { code: "EACCES" });
    unreadable = false;
    assert.equal(await fs.readFile(snapshotPath, "utf8"), before);

    let release;
    scanGate = new Promise((resolve) => {
      release = resolve;
    });
    await mount({});
    assert.deepEqual(await getPins(), [projectPath], "cold start must preserve pins while scanning");
    assert.equal(find("List")?.dataset.loading === "true", true);
    release();
    scanGate = undefined;
    await settle(() => !(find("List")?.dataset.loading === "true"));
    assert.deepEqual(await getPins(), [projectPath]);
    await act(async () => renderer.unmount());

    const renamed = path.join(root, "2026", "0907_Renamed");
    await fs.rename(projectPath, renamed);
    // Seed unsafe legacy hook values. Native cache subscription and real hook parsing are exercised.
    for (const cache of caches)
      for (const [key, value] of cache.data) {
        const parsed = JSON.parse(value);
        if (parsed?.years) {
          parsed.years[0].projects[0].links = { asana: "file:///tmp/file", drive: "custom:run", gid };
          cache.set(key, JSON.stringify(parsed));
        }
      }
    scanGate = new Promise((resolve) => {
      release = resolve;
    });
    await mount({ launchContext: { gid } });
    assert.equal(pushed.length, 0, "cached deeplink match must wait for the scan");
    assert.ok(findAll("ListItem").length > 0, "the cached list must actually render");
    assert.equal(findAll("ActionOpen").length, 0, "unsafe cached service actions must be absent");
    release();
    scanGate = undefined;
    await settle(() => pushed.length === 1);
    assert.equal(pushed[0].props.project.path, renamed);
    assert.equal(pushed[0].props.project.links.asana, url);
    await settle(() => storage.get("pinned-v1") === "[]");
    await act(async () => renderer.unmount());

    // Force a real read on the next scan, then restore access and invoke the actual Retry action.
    await fs.writeFile(path.join(renamed, "Asana.html"), `window.location.href = "${url}?updated=1"`);
    storage.set("pinned-v1", JSON.stringify([renamed]));
    unreadable = true;
    pushed.length = 0;
    await mount({ launchContext: { gid } });
    await settle(() => findAll("EmptyView").some((node) => node.dataset.title === "Could not read projects"));
    assert.equal(pushed.length, 0);
    assert.deepEqual(await getPins(), [renamed]);
    unreadable = false;
    const retry = findAll("Action").find((node) => node.dataset.title === "Retry");
    assert.ok(retry, "read errors must expose Retry");
    await act(async () => {
      retry.click();
    });
    await settle(() => pushed.length === 1);
    assert.equal(pushed[0].props.project.path, renamed);
    assert.deepEqual(await getPins(), [renamed]);
    await act(async () => renderer.unmount());
    renderer = undefined;

    const old = JSON.parse(await fs.readFile(snapshotPath, "utf8"));
    old.version = 3;
    old.years[0].projects[0].links = {};
    await fs.writeFile(snapshotPath, JSON.stringify(old));
    assert.ok((await buildProjectIndex(root)).years[0].projects[0].links.asana);
    await fs.rename(root, `${root}-offline`);
    await assert.rejects(buildProjectIndex(root), { code: "ENOENT" });
    console.log(
      "Passed: concurrent pins, failed writes, read recovery, real React cold starts, cached HTTPS validation, renamed deeplinks, retry, cache migration.",
    );
  } finally {
    if (renderer) await act(async () => renderer.unmount());
    Module._load = originalLoad;
    fs.readFile = originalReadFile;
    fs.readdir = originalReaddir;
    for (const [extension, loader] of Object.entries(originalExtensions)) {
      if (loader) require.extensions[extension] = loader;
      else delete require.extensions[extension];
    }
    await fs.rm(temp, { recursive: true, force: true });
    dom.window.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
