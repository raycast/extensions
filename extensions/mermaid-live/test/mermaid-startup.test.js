const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const esbuild = require("esbuild");

const VALID_FLOWCHART = "graph TD\nA-->B";
const VALID_SEQUENCE = "sequenceDiagram\nA->>B: hi";

async function renderCommand({ clipboardText, clipboardError, storedCode, initialHistory }) {
  const storage = new Map();
  if (storedCode) {
    storage.set("lastMermaidCode", storedCode);
  }
  if (initialHistory) {
    storage.set("mermaid-history", JSON.stringify(initialHistory));
  }

  const effects = [];
  const stateSlots = [];
  const refSlots = [];
  let stateIndex = 0;
  let refIndex = 0;

  const react = {
    useEffect(effect) {
      effects.push(effect);
    },
    useRef(initialValue) {
      const index = refIndex;
      refIndex += 1;
      if (!refSlots[index]) {
        refSlots[index] = { current: initialValue };
      }
      return refSlots[index];
    },
    useState(initialValue) {
      const index = stateIndex;
      stateIndex += 1;
      stateSlots[index] = initialValue;
      return [
        stateSlots[index],
        (value) => {
          stateSlots[index] = typeof value === "function" ? value(stateSlots[index]) : value;
        },
      ];
    },
  };

  const raycast = {
    Action: {
      CopyToClipboard: noop,
      Open: noop,
      OpenInBrowser: noop,
      Push: noop,
      SubmitForm: noop,
    },
    ActionPanel: noop,
    Clipboard: {
      async readText() {
        if (clipboardError) {
          throw clipboardError;
        }
        return clipboardText;
      },
    },
    Color: { Yellow: "yellow" },
    Detail: Object.assign(noop, {
      Metadata: {
        Label: noop,
        Link: noop,
        Separator: noop,
      },
    }),
    Form: Object.assign(noop, {
      TextField: noop,
    }),
    Icon: {
      CheckCircle: "check-circle",
      Clock: "clock",
      Pencil: "pencil",
      SaveDocument: "save-document",
      XMarkCircle: "x-mark-circle",
    },
    LocalStorage: {
      async getItem(key) {
        return storage.get(key);
      },
      async setItem(key, value) {
        storage.set(key, value);
      },
    },
    Toast: { Style: { Failure: "failure", Success: "success" } },
    showToast: noop,
    useNavigation() {
      return { pop: noop };
    },
  };

  const jsxRuntime = {
    Fragment: Symbol("Fragment"),
    jsx: noop,
    jsxs: noop,
  };

  const output = await esbuild.build({
    absWorkingDir: path.join(__dirname, ".."),
    bundle: true,
    entryPoints: ["src/mermaid.tsx"],
    external: ["@raycast/api", "react", "react/jsx-runtime"],
    format: "cjs",
    jsx: "automatic",
    platform: "node",
    write: false,
  });

  const module = { exports: {} };
  const context = {
    Buffer,
    clearInterval: noop,
    console,
    exports: module.exports,
    module,
    process,
    require(id) {
      if (id === "@raycast/api") return raycast;
      if (id === "react") return react;
      if (id === "react/jsx-runtime") return jsxRuntime;
      return require(id);
    },
    setInterval() {
      return 1;
    },
  };

  vm.runInNewContext(output.outputFiles[0].text, context);
  module.exports.default();

  assert.ok(effects.length >= 2);
  effects[0]();
  await flushPromises();
  effects[1]();
  await flushPromises();

  return {
    currentHistoryItem: stateSlots[1],
    state: stateSlots[0],
    storage,
  };
}

test("renders valid clipboard content on first launch without saved history", async () => {
  const result = await renderCommand({
    clipboardText: VALID_FLOWCHART,
  });

  assert.equal(result.state.mermaidCode, VALID_FLOWCHART);
  assert.equal(result.storage.get("lastMermaidCode"), VALID_FLOWCHART);
});

test("renders newer valid clipboard content instead of keeping an older saved diagram", async () => {
  const result = await renderCommand({
    clipboardText: VALID_SEQUENCE,
    storedCode: VALID_FLOWCHART,
  });

  assert.equal(result.state.mermaidCode, VALID_SEQUENCE);
  assert.equal(result.storage.get("lastMermaidCode"), VALID_SEQUENCE);
});

test("keeps the saved diagram visible when the clipboard is empty on startup", async () => {
  const result = await renderCommand({
    clipboardText: "",
    storedCode: VALID_FLOWCHART,
  });

  assert.equal(result.state.error, undefined);
  assert.equal(result.state.mermaidCode, VALID_FLOWCHART);
  assert.equal(result.storage.get("lastMermaidCode"), VALID_FLOWCHART);
});

test("keeps the saved diagram visible when reading the clipboard fails on startup", async () => {
  const result = await renderCommand({
    clipboardError: new Error("CLIPBOARD_DENIED"),
    storedCode: VALID_FLOWCHART,
  });

  assert.equal(result.state.error, undefined);
  assert.equal(result.state.mermaidCode, VALID_FLOWCHART);
  assert.equal(result.storage.get("lastMermaidCode"), VALID_FLOWCHART);
});

test("does not render bare Mermaid keywords as diagrams", async () => {
  const result = await renderCommand({
    clipboardText: "pie",
  });

  assert.equal(result.state.error?.message, "INVALID_MERMAID");
  assert.equal(result.state.mermaidCode, undefined);
  assert.equal(result.storage.get("lastMermaidCode"), undefined);
});

test("does not mark a new diagram as saved when all history slots are pinned", async () => {
  const pinnedHistory = Array.from({ length: 100 }, (_, index) => ({
    id: `pinned-${index}`,
    code: `graph TD\nA${index}-->B${index}`,
    name: `Pinned ${index}`,
    createdAt: new Date(index).toISOString(),
    lastAccessed: new Date(index).toISOString(),
    isPinned: true,
  }));

  const result = await renderCommand({
    clipboardText: VALID_SEQUENCE,
    initialHistory: pinnedHistory,
  });
  const persistedHistory = JSON.parse(result.storage.get("mermaid-history"));

  assert.equal(result.currentHistoryItem, null);
  assert.equal(persistedHistory.length, 100);
  assert.equal(persistedHistory.some((item) => item.code === VALID_SEQUENCE), false);
});

async function flushPromises() {
  await new Promise((resolve) => setImmediate(resolve));
}

function noop() {}
