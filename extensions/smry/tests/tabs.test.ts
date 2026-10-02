import assert from "node:assert/strict";
import test from "node:test";
import {
  findMatchingTab,
  getActiveSupportedTab,
  readableTabTitle,
  supportedTabs,
  type BrowserTab,
} from "../src/tabs";

function tab(overrides: Partial<BrowserTab>): BrowserTab {
  return {
    id: 1,
    url: "https://example.com/article",
    active: false,
    ...overrides,
  };
}

test("selects an active public tab and ignores active internal pages", () => {
  const publicTab = tab({ id: 2, active: true });
  assert.equal(
    getActiveSupportedTab([
      tab({ id: 1, active: true, url: "chrome://extensions" }),
      publicTab,
    ]),
    publicTab,
  );
  assert.equal(getActiveSupportedTab([tab({ active: true, url: "http://localhost:3000" })]), undefined);
});

test("sorts active tabs first without mutating the Browser Extension result", () => {
  const original = [tab({ id: 1 }), tab({ id: 2, active: true }), tab({ id: 3, url: "chrome://settings" })];
  const result = supportedTabs(original);
  assert.deepEqual(result.map((item) => item.id), [2, 1]);
  assert.deepEqual(original.map((item) => item.id), [1, 2, 3]);
});

test("matches a pasted link to an open tab after URL normalization", () => {
  const matching = tab({ id: 8, url: "https://example.com/" });
  assert.equal(findMatchingTab([matching], "example.com"), matching);
  assert.equal(findMatchingTab([matching], "https://example.com/other"), undefined);
});

test("uses hostname when a tab title is missing", () => {
  assert.equal(readableTabTitle(tab({ title: "  Article title  " })), "Article title");
  assert.equal(readableTabTitle(tab({ title: undefined })), "example.com");
});
