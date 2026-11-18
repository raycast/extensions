const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");

const NOTION = { name: "Notion", bundleId: "notion.id", path: "/Applications/Notion.app" };
const LINK = "https://app.notion.com/p/workspace/Page-0123456789abcdef0123456789abcdef?source=copy_link";

// Loads applescript-utils.ts with a fake clipboard. `onPress` plays Notion's part:
// it receives the clipboard and returns what the AppleScript would return.
function load(initialClipboard, onPress) {
  const state = { content: initialClipboard, copies: [], scripts: [] };
  const clipboard = {
    read: async () => ({ ...state.content }),
    readText: async () => state.content.text,
    copy: async (content, options) => {
      state.content = typeof content === "string" ? { text: content } : content;
      state.copies.push({ content, options });
    },
    clear: async () => {
      state.content = {};
    },
  };
  const mocks = {
    "@raycast/api": { Clipboard: clipboard },
    "@raycast/utils": {
      runAppleScript: async (script) => {
        state.scripts.push(script);
        return onPress(state);
      },
    },
  };
  const exports = {};
  const file = path.join(__dirname, "..", "src/utils/applescript-utils.ts");
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(js, {
    exports,
    require: (id) => (Object.hasOwn(mocks, id) ? mocks[id] : require(id)),
    console,
    setTimeout,
  });
  return { ...exports, state };
}

test("finds Notion's copy-link menu item by its shortcut, not its localized title", () => {
  const { scriptNotionCopyPageLink } = load({}, () => "false");
  const script = scriptNotionCopyPageLink("notion.id");
  assert.match(script, /bundle identifier is "notion\.id"/);
  assert.match(script, /AXMenuItemCmdChar" is "L"/);
  assert.match(script, /AXMenuItemCmdModifiers" is 0/);
  assert.doesNotMatch(script, /Copy Link/);
  assert.doesNotMatch(script, /keystroke/);
});

test("returns the link Notion puts on the clipboard", async () => {
  const { getNotionPageUrl, state } = load({ text: "previous" }, (s) => {
    s.content = { text: LINK };
    return "true";
  });
  assert.equal(await getNotionPageUrl(NOTION), LINK);
  assert.equal(state.content.text, LINK);
  assert.equal(state.scripts.length, 1);
});

test("keeps the placeholder out of clipboard history", async () => {
  const { getNotionPageUrl, state } = load({ text: "previous" }, (s) => {
    s.content = { text: LINK };
    return "true";
  });
  await getNotionPageUrl(NOTION);
  assert.equal(state.copies.length, 1);
  assert.equal(state.copies[0].options.concealed, true);
});

test("waits for Notion to write the link asynchronously", async () => {
  const { getNotionPageUrl } = load({ text: "previous" }, (s) => {
    setTimeout(() => {
      s.content = { text: LINK };
    }, 120);
    return "true";
  });
  assert.equal(await getNotionPageUrl(NOTION), LINK);
});

test("restores the previous clipboard when the menu item is not found", async () => {
  const { getNotionPageUrl, state } = load({ text: "previous" }, () => "false");
  assert.equal(await getNotionPageUrl(NOTION), "");
  assert.equal(state.content.text, "previous");
});

test("restores the previous clipboard when Notion copies nothing", async () => {
  const { getNotionPageUrl, state } = load({ text: "previous" }, () => "true");
  assert.equal(await getNotionPageUrl(NOTION), "");
  assert.equal(state.content.text, "previous");
});

test("ignores clipboard content that is not a link and restores the clipboard", async () => {
  const { getNotionPageUrl, state } = load({ html: "<b>previous</b>", text: "previous" }, (s) => {
    s.content = { text: "Some selected text" };
    return "true";
  });
  assert.equal(await getNotionPageUrl(NOTION), "");
  assert.equal(state.content.html, "<b>previous</b>");
  assert.equal(state.content.text, "previous");
});

test("restores the previous clipboard when the script fails", async () => {
  const { getNotionPageUrl, state } = load({ text: "previous" }, () => {
    throw new Error("System Events is not allowed assistive access");
  });
  assert.equal(await getNotionPageUrl(NOTION), "");
  assert.equal(state.content.text, "previous");
});

test("does nothing for an app without a bundle identifier", async () => {
  const { getNotionPageUrl, state } = load({ text: "previous" }, () => "true");
  assert.equal(await getNotionPageUrl({ name: "Notion", path: "/Applications/Notion.app" }), "");
  assert.equal(state.copies.length, 0);
  assert.equal(state.scripts.length, 0);
});
