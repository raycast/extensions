const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");

const NOTION = { name: "Notion", bundleId: "notion.id", path: "/Applications/Notion.app" };
const LINK = "https://app.notion.com/p/workspace/Page-0123456789abcdef0123456789abcdef?source=copy_link";

// Loads applescript-utils.ts with a fake clipboard and a fake Notion. Each handler
// plays Notion's part for one action and returns what the AppleScript would return:
// copyLink for the Copy Link to Current Page menu item (⌘L), copySelection for
// Edit > Copy (⌘C), and dismiss for the Escape key press.
function load(initialClipboard, notion) {
  const state = { content: initialClipboard, copies: [], actions: [] };
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
  const run = (action) => {
    state.actions.push(action);
    return notion[action] ? notion[action](state) : "false";
  };
  const mocks = {
    "@raycast/api": { Clipboard: clipboard },
    "@raycast/utils": {
      runAppleScript: async (script) => {
        if (script.includes("key code 53")) return run("dismiss");
        if (script.includes('AXMenuItemCmdChar" is "L"')) return run("copyLink");
        if (script.includes('AXMenuItemCmdChar" is "C"')) return run("copySelection");
        throw new Error(`Unexpected script: ${script}`);
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

const writes = (text) => (state) => {
  state.content = { text };
  return "true";
};
const writesNothing = () => "true";

test("finds Notion's menu items by shortcut, not by localized title", () => {
  const { scriptNotionPressMenuItem } = load({}, {});
  const script = scriptNotionPressMenuItem("notion.id", "L");
  assert.match(script, /bundle identifier is "notion\.id"/);
  assert.match(script, /AXMenuItemCmdChar" is "L"/);
  assert.match(script, /AXMenuItemCmdModifiers" is 0/);
  assert.doesNotMatch(script, /Copy Link/);
  assert.doesNotMatch(script, /keystroke/);
});

test("returns the link Notion puts on the clipboard", async () => {
  const { getNotionPageUrl, state } = load({ text: "previous" }, { copyLink: writes(LINK) });
  assert.equal(await getNotionPageUrl(NOTION), LINK);
  assert.equal(state.content.text, LINK);
  assert.equal(state.actions.join(), "copyLink");
});

test("keeps the placeholder out of clipboard history", async () => {
  const { getNotionPageUrl, state } = load({ text: "previous" }, { copyLink: writes(LINK) });
  await getNotionPageUrl(NOTION);
  assert.equal(state.copies.length, 1);
  assert.equal(state.copies[0].options.concealed, true);
});

test("waits for Notion to write the link asynchronously", async () => {
  const { getNotionPageUrl, state } = load(
    { text: "previous" },
    {
      copyLink: (s) => {
        setTimeout(() => {
          s.content = { text: LINK };
        }, 120);
        return "true";
      },
    },
  );
  assert.equal(await getNotionPageUrl(NOTION), LINK);
  assert.equal(state.actions.join(), "copyLink");
});

test("copies the link from Notion's popover when the page does not have keyboard focus", async () => {
  const { getNotionPageUrl, state } = load(
    { text: "previous" },
    { copyLink: writesNothing, copySelection: writes(LINK), dismiss: () => "" },
  );
  assert.equal(await getNotionPageUrl(NOTION), LINK);
  assert.equal(state.content.text, LINK);
  assert.equal(state.actions.join(), "copyLink,copySelection,dismiss");
});

test("restores the clipboard and sends no key press when the selection is not a link", async () => {
  const { getNotionPageUrl, state } = load(
    { html: "<b>previous</b>", text: "previous" },
    { copyLink: writesNothing, copySelection: writes("Some selected text") },
  );
  assert.equal(await getNotionPageUrl(NOTION), "");
  assert.equal(state.content.html, "<b>previous</b>");
  assert.equal(state.content.text, "previous");
  assert.equal(state.actions.join(), "copyLink,copySelection");
});

test("restores the previous clipboard when Notion copies nothing at all", async () => {
  const { getNotionPageUrl, state } = load(
    { text: "previous" },
    { copyLink: writesNothing, copySelection: writesNothing },
  );
  assert.equal(await getNotionPageUrl(NOTION), "");
  assert.equal(state.content.text, "previous");
  assert.equal(state.actions.join(), "copyLink,copySelection");
});

test("restores the previous clipboard when the menu item is not found", async () => {
  const { getNotionPageUrl, state } = load({ text: "previous" }, { copyLink: () => "false" });
  assert.equal(await getNotionPageUrl(NOTION), "");
  assert.equal(state.content.text, "previous");
  assert.equal(state.actions.join(), "copyLink");
});

test("restores the previous clipboard when the script fails", async () => {
  const { getNotionPageUrl, state } = load(
    { text: "previous" },
    {
      copyLink: () => {
        throw new Error("System Events is not allowed assistive access");
      },
    },
  );
  assert.equal(await getNotionPageUrl(NOTION), "");
  assert.equal(state.content.text, "previous");
});

test("does nothing for an app without a bundle identifier", async () => {
  const { getNotionPageUrl, state } = load({ text: "previous" }, { copyLink: writes(LINK) });
  assert.equal(await getNotionPageUrl({ name: "Notion", path: "/Applications/Notion.app" }), "");
  assert.equal(state.copies.length, 0);
  assert.equal(state.actions.length, 0);
});
