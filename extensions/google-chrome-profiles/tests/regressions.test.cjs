const assert = require("node:assert/strict");
const { test } = require("node:test");
const { EventEmitter } = require("node:events");
const { PassThrough } = require("node:stream");
const { execFileSync } = require("node:child_process");
const { loadModule } = require("./helpers.cjs");

const browser = { appName: "Google Chrome", appPath: "/Applications/Google Chrome.app", dataPath: "unused" };
const profile = { directory: "Profile 1", name: "Work", givenName: "Alex" };
const other = { directory: "Default", name: "Personal" };
const localState = {
  profile: { info_cache: { "Profile 1": { name: "Work", gaia_given_name: "Alex" }, Default: { name: "Personal" } } },
};

function setup({ output = "", error, spawnError } = {}) {
  const events = [];
  const commands = [];
  const mocks = {
    "@raycast/api": {
      getPreferenceValues: () => ({}),
      Toast: { Style: { Failure: "failure" } },
      showToast: async () => events.push("failure"),
    },
    "fs/promises": { readFile: async () => JSON.stringify(localState) },
    child_process: {
      spawn: (file, args, options) => {
        commands.push({ file, args, options });
        const child = new EventEmitter();
        child.stdout = new PassThrough();
        child.stderr = new PassThrough();
        child.unref = () => events.push("unref");
        queueMicrotask(() => {
          if (spawnError) child.emit("error", new Error(spawnError));
          else {
            child.stdout.write(output);
            if (error) child.stderr.write(error);
            events.push("complete");
            child.emit("close", error ? 1 : 0);
          }
          child.stdout.end();
          child.stderr.end();
        });
        return child;
      },
    },
  };
  return {
    chrome: loadModule("src/util/chrome.ts", mocks),
    profiles: loadModule("src/util/profiles.ts", mocks),
    events,
    commands,
  };
}

test("account name and email remain searchable without an avatar", () => {
  const { profiles } = setup();
  const items = profiles.extractProfiles({
    Default: { name: "Home", user_name: "alex@example.com", gaia_name: "Alex Smith" },
  });
  assert.equal(items[0].ga.email, "alex@example.com");
  assert.equal(profiles.filterProfiles(items, "  SMITH example.com ").length, 1);
  assert.equal(profiles.filterProfiles(items, "missing").length, 0);
});

test("cold launches retain the requested profile, window flag, and literal URL", () => {
  const { chrome } = setup();
  const url = 'https://example.com/?q="&x=$(touch /tmp/never)';
  assert.deepEqual(chrome.launchArguments(profile, { action: "openUrl", url }, browser, true), [
    "-n",
    "-a",
    browser.appPath,
    "--args",
    "--profile-directory=Profile 1",
    "--new-window",
    url,
  ]);
  assert.deepEqual(chrome.launchArguments(profile, { action: "focus" }, browser).slice(-1), [
    "--profile-directory=Profile 1",
  ]);
});

test("profile actions run detached and finish before Raycast is dismissed", async () => {
  const { chrome, commands, events } = setup();
  assert.equal(
    await chrome.openGoogleChrome(profile, { action: "focus" }, async () => events.push("hud"), browser),
    true,
  );
  assert.equal(commands.length, 1);
  assert.equal(commands[0].options.detached, true);
  assert.ok(commands[0].options.timeout > 0);
  assert.deepEqual(events, ["unref", "complete", "hud"]);
});

test("action failure is surfaced without retrying or showing a success HUD", async () => {
  const { chrome, commands, events } = setup({ error: "operation timed out" });
  assert.equal(
    await chrome.openGoogleChrome(
      profile,
      { action: "openUrl", url: "https://example.com" },
      async () => events.push("hud"),
      browser,
    ),
    false,
  );
  assert.equal(commands.length, 1);
  assert.deepEqual(events, ["unref", "complete", "failure"]);
});

test("spawn failure is surfaced without showing a success HUD", async () => {
  const { chrome, events } = setup({ spawnError: "ENOENT" });
  assert.equal(
    await chrome.openGoogleChrome(profile, { action: "newWindow" }, async () => events.push("hud"), browser),
    false,
  );
  assert.deepEqual(events, ["unref", "failure"]);
});

test("current tab uses an exact account label, not a substring", async () => {
  const { chrome } = setup({ output: "12\u001f34\u001fhttps://example.com\u001fAlex (Work)" });
  const source = await chrome.readCurrentTab(browser, [profile, { ...other, name: "Work admin" }]);
  assert.equal(source.profile.directory, profile.directory);
  assert.equal(source.tabId, 34);
});

test("ambiguous source profiles are rejected", async () => {
  const { chrome } = setup({ output: "12\u001f34\u001fhttps://example.com\u001fWork" });
  await assert.rejects(chrome.readCurrentTab(browser, [profile, { ...other, name: "Work" }]), /Could not identify/);
});

test("moving to the source profile never starts a process", async () => {
  const { chrome, commands } = setup();
  await assert.rejects(
    chrome.moveCurrentTab({ windowId: 12, tabId: 34, url: "https://example.com", profile }, profile, browser, [
      other,
      profile,
    ]),
    /Choose another/,
  );
  assert.equal(commands.length, 0);
});

test(
  "AppleScript literals round-trip quotes, backslashes, and line breaks",
  { skip: process.platform !== "darwin" },
  () => {
    const { chrome } = setup();
    const input = 'Alex "Work" \\ $(literal)\nsecond\tline';
    const output = execFileSync("/usr/bin/osascript", ["-e", `return ${chrome.appleScriptString(input)}`], {
      encoding: "utf8",
    });
    assert.equal(output, `${input}\n`);
  },
);
