const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");

function loadCommand(file, dependencies) {
  const exports = {};
  const source = fs.readFileSync(path.join(root, "src", file), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  });
  vm.runInNewContext(outputText, {
    exports,
    require: (name) => dependencies[name] ?? require(name),
  });
  return exports;
}

function harness({ clipboard = "Copied text", status = "filled", error = null } = {}) {
  const calls = [];
  const api = {
    Clipboard: {
      readText: async () => { calls.push(["readClipboard"]); return clipboard; },
    },
    closeMainWindow: async () => calls.push(["close"]),
    environment: { assetsPath: "/bundled/assets" },
    open: async (url, app) => calls.push(["open", url, app]),
    showHUD: async (message) => calls.push(["hud", message]),
  };
  const childProcess = {
    execFile: (file, args, options, callback) => {
      calls.push(["exec", file, Array.from(args), options.timeout]);
      const stdin = new EventEmitter();
      stdin.end = (text) => {
        calls.push(["stdin", text]);
        callback(error, status);
      };
      return { stdin };
    },
  };
  const { openChat } = loadCommand("open-chat.ts", {
    "@raycast/api": api,
    "node:child_process": childProcess,
  });
  return { openChat, calls };
}

const destinations = {
  cla: ["claude", "https://claude.ai/new"],
  gem: ["gemini", "https://gemini.google.com/app"],
  gpt: ["chatgpt", "https://chatgpt.com/"],
  grok: ["grok", "https://grok.com/"],
};

for (const [name, [provider, url]] of Object.entries(destinations)) {
  test(`${name} routes typed and clipboard commands to ${provider}`, async () => {
    const { openChat, calls } = harness();
    const dependencies = { "@raycast/api": {}, "./open-chat": { openChat } };
    const query = "Question with quotes, emoji 🌱, and\na second line";
    await loadCommand(`${name}.ts`, dependencies).default({ arguments: { query } });
    assert.deepEqual(calls.find(([type]) => type === "open"), ["open", url, "com.google.Chrome"]);
    assert.deepEqual(calls.find(([type]) => type === "stdin"), ["stdin", query]);
    assert(!calls.some(([type]) => type === "readClipboard" || type === "paste"));
    assert(!JSON.stringify(calls.find(([type]) => type === "exec")).includes(query));

    calls.length = 0;
    await loadCommand(`${name}-clipboard.ts`, dependencies).default();
    assert.deepEqual(calls.find(([type]) => type === "open"), ["open", url, "com.google.Chrome"]);
    assert.deepEqual(calls.find(([type]) => type === "stdin"), ["stdin", "Copied text"]);
    assert.equal(calls.filter(([type]) => type === "readClipboard").length, 1);
  });
}

test("opening without a query or with whitespace does not read the clipboard or fill", async () => {
  for (const options of [undefined, { query: "" }, { query: " \n\t " }]) {
    const { openChat, calls } = harness();
    await openChat("claude", options);
    assert.deepEqual(calls.map(([type]) => type), ["close", "open"]);
  }
});

test("empty and non-text clipboards only open the site", async () => {
  for (const clipboard of [undefined, "", " \n "]) {
    const { openChat, calls } = harness({ clipboard: clipboard ?? null });
    await openChat("gemini", { useClipboard: true });
    assert.deepEqual(calls.map(([type]) => type), ["readClipboard", "close", "open"]);
  }
});

test("an existing draft is preserved and typed queries are not directed to paste stale clipboard text", async () => {
  const { openChat, calls } = harness({ status: "draft" });
  await openChat("claude", { query: "Typed text" });
  assert(!calls.some(([type]) => type === "paste"));
  const message = calls.find(([type]) => type === "hud")[1];
  assert.match(message, /Existing draft kept/);
  assert(!message.includes("⌘V"));
});

test("focus changes never trigger a blind paste from Raycast", async () => {
  const { openChat, calls } = harness({ status: "focus-changed" });
  await openChat("grok", { query: "Typed text" });
  assert(!calls.some(([type]) => type === "paste" || type === "readClipboard"));
  assert.match(calls.find(([type]) => type === "hud")[1], /retry/);
});

test("helper failures show a recovery message without exposing the prompt", async () => {
  const { openChat, calls } = harness({ error: new Error("helper failed") });
  await openChat("chatgpt", { query: "Private query" });
  const message = calls.find(([type]) => type === "hud")[1];
  assert.match(message, /check Chrome/);
  assert(!message.includes("Private query"));
});

test("a reformatted paste asks for review rather than another paste", async () => {
  const { openChat, calls } = harness({ status: "pasted-unverified" });
  await openChat("claude", { useClipboard: true });
  const message = calls.find(([type]) => type === "hud")[1];
  assert.match(message, /check the chat/i);
  assert(!message.includes("⌘V") && !message.includes("retry"));
});
