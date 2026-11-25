const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");

const CHROME = { name: "Google Chrome", bundleId: "com.google.Chrome", path: "/Applications/Google Chrome.app" };
const USER_TAB = "https://example.com/the-tab-in-use";
const AUTOMATION_TAB = "https://example.com/a-hidden-automation-page";

// Loads applescript-utils.ts with fake scripts. frontInstance plays the script that
// asks the frontmost instance by process ID, byName the "tell application" script.
function load({ frontInstance, byName }) {
  const calls = [];
  const mocks = {
    "@raycast/api": {},
    "@raycast/utils": {
      runAppleScript: async (script, options) => {
        if (options?.language === "JavaScript") {
          calls.push("frontInstance");
          return frontInstance(script);
        }
        calls.push("byName");
        return byName(script);
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
  return { ...exports, calls };
}

const fails = () => {
  throw new Error("Can’t get window 1. Invalid index. (-1719)");
};

test("asks the frontmost instance by process ID, only when more than one is running", () => {
  const { scriptChromiumFrontInstancePath } = load({});
  const script = scriptChromiumFrontInstancePath("com.google.Chrome");
  assert.match(script, /const bundleId = "com\.google\.Chrome";/);
  assert.match(script, /runningApplicationsWithBundleIdentifier\(bundleId\)/);
  assert.match(script, /instances\.count > 1/);
  assert.match(script, /applicationWithProcessIdentifier\(frontmost\.processIdentifier\)/);
  assert.doesNotMatch(script, /Application\(/);
});

test("escapes the bundle identifier it puts in the script", () => {
  const { scriptChromiumFrontInstancePath } = load({});
  const script = scriptChromiumFrontInstancePath('com.example"; doSomething(); "');
  assert.match(script, /const bundleId = "com\.example\\"; doSomething\(\); \\"";/);
});

test("copies the tab in use when an automation instance would answer by name", async () => {
  const { getChromiumBrowserPath, calls } = load({ frontInstance: () => USER_TAB, byName: () => AUTOMATION_TAB });
  assert.equal(await getChromiumBrowserPath(CHROME), USER_TAB);
  assert.deepEqual(calls, ["frontInstance"]);
});

test("copies the tab in use when the instance that answers by name has no windows", async () => {
  const { getChromiumBrowserPath } = load({ frontInstance: () => `${USER_TAB}\n`, byName: fails });
  assert.equal(await getChromiumBrowserPath(CHROME), USER_TAB);
});

test("asks by name, as before, when only one instance is running", async () => {
  const { getChromiumBrowserPath, calls } = load({ frontInstance: () => "", byName: () => USER_TAB });
  assert.equal(await getChromiumBrowserPath(CHROME), USER_TAB);
  assert.deepEqual(calls, ["frontInstance", "byName"]);
});

test("asks by name when the frontmost instance cannot be asked", async () => {
  const { getChromiumBrowserPath } = load({ frontInstance: fails, byName: () => USER_TAB });
  assert.equal(await getChromiumBrowserPath(CHROME), USER_TAB);
});

test("asks by name only when the app has no bundle identifier", async () => {
  const { getChromiumBrowserPath, calls } = load({ frontInstance: fails, byName: () => USER_TAB });
  assert.equal(await getChromiumBrowserPath({ name: "Chromium", path: "/tmp/Chromium.app" }), USER_TAB);
  assert.deepEqual(calls, ["byName"]);
});

test("copies nothing when neither script finds a URL", async () => {
  const { getChromiumBrowserPath } = load({ frontInstance: () => "", byName: fails });
  assert.equal(await getChromiumBrowserPath(CHROME), "");
});
