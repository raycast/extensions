import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { CURRENT_BROWSER_TAB_SCRIPT } from "../src/utils/browser-script.ts";
import { BROWSERS } from "../src/utils/browser-config.ts";

function runScript(browserId, overrides = {}) {
  const calls = [];
  const title = '[PROJ-123] Fix $(touch /tmp/never-run) `quotes` " – Jira';
  const url = "https://your-team.atlassian.net/browse/PROJ-123";
  const tab = {
    url: () => url,
    name: () => {
      calls.push("name");
      return title;
    },
    title: () => {
      calls.push("title");
      return title;
    },
  };
  const browser = {
    running: () => true,
    windows: () => [
      {
        currentTab: () => {
          calls.push("currentTab");
          return tab;
        },
        activeTab: () => {
          calls.push("activeTab");
          return tab;
        },
      },
    ],
    ...overrides,
  };
  const context = vm.createContext({
    Application: (id) => {
      calls.push(id);
      return browser;
    },
  });
  vm.runInContext(CURRENT_BROWSER_TAB_SCRIPT, context);
  return { result: JSON.parse(context.run([browserId])), calls, expected: { url, title } };
}

test("browser automation reads the Safari current tab without webpage JavaScript", () => {
  const { result, expected, calls } = runScript("com.apple.Safari");
  assert.deepEqual(result, expected);
  assert.deepEqual(calls, ["com.apple.Safari", "currentTab", "name"]);
});

test("all supported Chromium browsers read activeTab and title", () => {
  for (const browser of BROWSERS.filter((b) => b.engine === "chromium")) {
    const { result, expected, calls } = runScript(browser.id);
    assert.deepEqual(result, expected);
    assert.deepEqual(calls, [browser.id, "activeTab", "title"]);
  }
});

test("automation refuses application IDs outside the supported browser list", () => {
  assert.throws(() => runScript("com.malicious.Application"), /UNSUPPORTED_BROWSER/);
});

test("a closed browser is not launched and a missing window produces a clean failure", () => {
  assert.throws(
    () =>
      runScript("com.apple.Safari", {
        running: () => false,
        windows: () => {
          throw new Error("must not read");
        },
      }),
    /BROWSER_NOT_RUNNING/,
  );
  assert.throws(() => runScript("com.apple.Safari", { windows: () => [] }), /BROWSER_NO_WINDOWS/);
});
