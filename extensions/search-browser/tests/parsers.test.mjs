import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  FIELD_SEP,
  RECORD_SEP,
  computeTabSwitchSteps,
  extractAppleScriptErrorMessage,
  getCommandNumberKeyCode,
  isAccessibilityPermissionError,
  isAutomationPermissionError,
  parseAppleScriptTabs,
  parseSearchAppPrefsXml,
} from "../.test-dist/applescript-parser.js";
import {
  flattenBookmarkNodes,
  readBookmarks,
  readBrowserSettings,
  readHistory,
  readLocalBrowserSnapshot,
  readPinnedTabs,
  readRemoteDeviceTabs,
  readSessionTabs,
  readSpaces,
  resolveLocalFaviconPath,
} from "../.test-dist/storage.js";
import {
  buildNavigableUrl,
  decodeBase64Json,
  formatMarkdownLink,
  getDateSectionLabel,
  getDomain,
  looksLikeUrl,
  matchesQuery,
  normalizeUrlKey,
  parseSearchTimestamp,
} from "../.test-dist/utils.js";

test("parseSearchTimestamp converts Apple CFAbsoluteTime and Unix timestamps accurately", () => {
  const appleDate = parseSearchTimestamp(817500366.791614);
  assert.equal(appleDate.getUTCFullYear(), 2026);
  assert.equal(appleDate.getUTCMonth(), 10);
  assert.equal(appleDate.getUTCDate(), 27);

  const unixDate = parseSearchTimestamp(1795807567);
  assert.equal(unixDate.getUTCFullYear(), 2026);

  const msDate = parseSearchTimestamp(1795807567000);
  assert.equal(msDate.getUTCFullYear(), 2026);
});

test("looksLikeUrl and buildNavigableUrl handle URLs, domains, localhost, and all Search engines", () => {
  assert.equal(looksLikeUrl("https://searchbrowser.app"), true);
  assert.equal(looksLikeUrl("searchbrowser.app/docs"), true);
  assert.equal(looksLikeUrl("localhost:3000/api"), true);
  assert.equal(looksLikeUrl("127.0.0.1:8080"), true);
  assert.equal(looksLikeUrl("raycast search browser"), false);
  assert.equal(looksLikeUrl("hello"), false);

  const direct = buildNavigableUrl("searchbrowser.app");
  assert.equal(direct.isSearch, false);
  assert.equal(direct.url, "https://searchbrowser.app");

  const local = buildNavigableUrl("localhost:3000");
  assert.equal(local.isSearch, false);
  assert.equal(local.url, "http://localhost:3000");

  const startpage = buildNavigableUrl("webkit mac", "browser", { engine: "startpage" });
  assert.equal(startpage.isSearch, true);
  assert.equal(startpage.engineName, "Startpage");
  assert.equal(startpage.url, "https://www.startpage.com/sp/search?query=webkit%20mac");

  const qwant = buildNavigableUrl("webkit mac", "browser", { engine: "qwant" });
  assert.equal(qwant.engineName, "Qwant");
  assert.equal(qwant.url, "https://www.qwant.com/?q=webkit%20mac");

  const customWithPlaceholder = buildNavigableUrl("foo bar", "browser", {
    engine: "custom",
    customSearchUrl: "https://example.org/find?term=%s&lang=en",
  });
  assert.equal(customWithPlaceholder.url, "https://example.org/find?term=foo%20bar&lang=en");

  const customWithoutPlaceholder = buildNavigableUrl("foo bar", "browser", {
    engine: "custom",
    customSearchUrl: "https://example.org/find?q=",
  });
  assert.equal(customWithoutPlaceholder.url, "https://example.org/find?q=foo%20bar");

  const emptyCustom = buildNavigableUrl("foo bar", "browser", { engine: "custom", customSearchUrl: "" });
  assert.equal(emptyCustom.engineName, "Google");
});

test("formatting, matching, and local-timezone date grouping work as expected", () => {
  assert.equal(getDomain("https://www.searchbrowser.app/download"), "searchbrowser.app");
  assert.equal(
    formatMarkdownLink("Search [Mac]", "https://searchbrowser.app/"),
    "[Search \\[Mac\\]](https://searchbrowser.app/)"
  );
  assert.equal(normalizeUrlKey("https://SearchBrowser.app/"), "https://searchbrowser.app");
  assert.equal(matchesQuery("search mac", "Search Browser", "https://searchbrowser.app", "Mac"), true);
  assert.equal(matchesQuery("firefox", "Search Browser", "https://searchbrowser.app"), false);

  // Use local Date constructors so tests pass in every timezone (UTC-12 through UTC+14)
  const now = new Date(2026, 10, 27, 18, 0, 0);
  assert.equal(getDateSectionLabel(new Date(2026, 10, 27, 9, 0, 0), now), "Today");
  assert.equal(getDateSectionLabel(new Date(2026, 10, 26, 12, 0, 0), now), "Yesterday");
  assert.equal(getDateSectionLabel(new Date(2026, 10, 22, 12, 0, 0), now), "This Week");
  assert.equal(getDateSectionLabel(new Date(2026, 10, 5, 12, 0, 0), now), "This Month");
  assert.equal(getDateSectionLabel(new Date(2026, 0, 1, 12, 0, 0), now), "Older");
});

test("parseAppleScriptTabs handles trailing newlines, missing value, empty URLs, and duplicate URLs", () => {
  const row1 = ["17466", "1", "Personal", "Personal", "0", "YouTube", "https://www.youtube.com/"].join(FIELD_SEP);
  const row2 = ["17466", "2", "Personal", "Personal", "1", "YouTube", "https://www.youtube.com/"].join(FIELD_SEP);
  const row3 = [
    "17466",
    "3",
    "missing value",
    "missing value",
    "0",
    "missing value",
    "https://searchbrowser.app/",
  ].join(FIELD_SEP);
  const rowEmpty = ["17466", "4", "Personal", "Personal", "0", "Blank", "missing value"].join(FIELD_SEP);

  const raw = `${row1}${RECORD_SEP}${row2}${RECORD_SEP}\n${row3}${RECORD_SEP}${rowEmpty}${RECORD_SEP}\n`;
  const tabs = parseAppleScriptTabs(raw);

  assert.equal(tabs.length, 3);
  assert.equal(tabs[0].isActive, false);
  assert.equal(tabs[0].activeTabIndex, 2);
  assert.equal(tabs[0].windowTabCount, 3);
  assert.equal(tabs[0].windowCount, 1);
  assert.equal(tabs[0].activeTabTitle, "YouTube");
  assert.equal(tabs[1].isActive, true);
  assert.equal(tabs[2].title, "searchbrowser.app");
  assert.equal(tabs[2].space, "Unknown Space");
  assert.equal(tabs[2].profile, "Personal");

  assert.equal(isAutomationPermissionError(new Error("Not authorized to send Apple events to Search. (-1743)")), true);
  assert.equal(isAutomationPermissionError(new Error("Some other error")), false);
  assert.equal(isAccessibilityPermissionError(new Error("osascript is not allowed assistive access. (-1002)")), true);

  // C1 regression test: execFile errors include the entire AppleScript in err.message;
  // only err.stderr should be inspected so script source strings never trigger false positives.
  const execFileErr = Object.assign(
    new Error(
      'Command failed: osascript -e \'set targetUrl to "https://example.com/accessibility"\nif bad then error "MENU_ITEM_DISABLED"\'\n'
    ),
    { stderr: "execution error: Search got an error: Can’t get window 1. (-1728)\n" }
  );
  assert.equal(
    extractAppleScriptErrorMessage(execFileErr),
    "execution error: Search got an error: Can’t get window 1. (-1728)"
  );
  assert.equal(isAccessibilityPermissionError(execFileErr), false);
  assert.equal(extractAppleScriptErrorMessage(execFileErr).includes("MENU_ITEM_DISABLED"), false);

  // C2 regression test: XML1 plist containing Date & Data values parses booleans accurately
  const realStyleXml = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>extensions.checked</key>
  <date>2026-11-27T12:00:05Z</date>
  <key>shortcuts</key>
  <data>e30=</data>
  <key>links.little</key>
  <false/>
  <key>links.little.tabs</key>
  <true/>
</dict>
</plist>`;
  assert.deepEqual(parseSearchAppPrefsXml(realStyleXml), {
    linksLittle: false,
    linksReuseTabs: true,
    spacesUseCommandNumbers: false,
  });
  // Missing links.little defaults conservatively to true so we don't accidentally trigger a Small Window
  assert.deepEqual(parseSearchAppPrefsXml("<plist><dict></dict></plist>"), {
    linksLittle: true,
    linksReuseTabs: false,
    spacesUseCommandNumbers: false,
  });

  assert.deepEqual(computeTabSwitchSteps(2, 2), { direction: "none", steps: 0 });
  assert.deepEqual(computeTabSwitchSteps(2, 1), { direction: "previous", steps: 1 });
  assert.deepEqual(computeTabSwitchSteps(1, 4), { direction: "next", steps: 3 });
  assert.deepEqual(computeTabSwitchSteps(0, 2), { direction: "none", steps: 0 });

  assert.equal(
    getCommandNumberKeyCode(
      { tabIndex: 1, windowTabCount: 5 },
      { spacesUseCommandNumbers: false, hasPinnedTabs: false }
    ),
    18
  );
  assert.equal(
    getCommandNumberKeyCode(
      { tabIndex: 12, windowTabCount: 12 },
      { spacesUseCommandNumbers: false, hasPinnedTabs: false }
    ),
    25
  );
  assert.equal(
    getCommandNumberKeyCode(
      { tabIndex: 9, windowTabCount: 12 },
      { spacesUseCommandNumbers: false, hasPinnedTabs: false }
    ),
    null
  );
  assert.equal(
    getCommandNumberKeyCode(
      { tabIndex: 1, windowTabCount: 5 },
      { spacesUseCommandNumbers: true, hasPinnedTabs: false }
    ),
    null
  );
  assert.equal(
    getCommandNumberKeyCode(
      { tabIndex: 1, windowTabCount: 5 },
      { spacesUseCommandNumbers: false, hasPinnedTabs: true }
    ),
    null
  );
});

test("storage readers parse Search Browser JSON fixtures, profiles, pins, sessions, and favicons cleanly", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "search-browser-test-"));
  try {
    fs.mkdirSync(path.join(tmpDir, "icons"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, "profiles", "WorkProfile"), { recursive: true });

    fs.writeFileSync(
      path.join(tmpDir, "history.json"),
      JSON.stringify([
        {
          key: "https://searchbrowser.app/",
          title: "Search Browser",
          last: 817500366.79,
          count: 5,
          url: "https://searchbrowser.app/",
        },
        { key: "https://example.com/", title: "", last: 1795800000, count: 1, url: "https://example.com/" },
      ])
    );

    // Additional profile history entry for the same URL -> visit counts should sum
    fs.writeFileSync(
      path.join(tmpDir, "profiles", "WorkProfile", "history.json"),
      JSON.stringify([
        {
          key: "https://searchbrowser.app/",
          title: "Search Browser Updated",
          last: 817500500.0,
          count: 3,
          url: "https://searchbrowser.app/",
        },
      ])
    );

    fs.writeFileSync(
      path.join(tmpDir, "session.json"),
      JSON.stringify({
        active: 1,
        tabs: [
          { url: "https://www.youtube.com/", title: "YouTube", touched: 817499000 },
          { url: "https://searchbrowser.app/", title: "Search Browser", touched: 817500499 },
        ],
      })
    );

    fs.writeFileSync(
      path.join(tmpDir, "session-00000000-0000-0000-0000-000000000A11.json"),
      JSON.stringify({
        active: 0,
        tabs: [{ url: "https://linear.app/", title: "Linear", touched: 817500100 }],
      })
    );

    const bookmarksFixture = [
      {
        id: "folder-1",
        title: "Work",
        children: [
          { id: "bm-1", title: "GitHub", url: "https://github.com/" },
          {
            id: "folder-2",
            title: "Docs",
            children: [{ id: "bm-2", title: "Raycast API", url: "https://developers.raycast.com/" }],
          },
        ],
      },
      { id: "bm-3", title: "Search Browser", url: "https://searchbrowser.app/" },
    ];
    fs.writeFileSync(path.join(tmpDir, "bookmarks.json"), JSON.stringify(bookmarksFixture));

    fs.writeFileSync(path.join(tmpDir, "pin-folders.json"), JSON.stringify([{ id: "pf-1", name: "Daily" }]));
    fs.writeFileSync(
      path.join(tmpDir, "pins.json"),
      JSON.stringify({
        "space-work": [{ id: "pin-1", title: "Linear", url: "https://linear.app/", folder: "pf-1" }],
      })
    );

    const spacesPayload = Buffer.from(
      JSON.stringify([
        { id: "space-personal", name: "Personal", colour: 0 },
        { id: "space-work", name: "Work", colour: 2 },
        { id: "00000000-0000-0000-0000-000000000A11", name: "Archive", colour: 4 },
      ])
    ).toString("base64");
    const settingsPayload = Buffer.from(JSON.stringify({ engine: "kagi", look: "system" })).toString("base64");
    const sharedPinsPayload = Buffer.from(
      JSON.stringify([{ id: "pin-shared", title: "Calendar", url: "https://calendar.google.com/" }])
    ).toString("base64");
    const remotePayload = Buffer.from(
      JSON.stringify({
        at: 817500377,
        name: "iPhone",
        platform: "ios",
        tabs: [{ title: "Hacker News", url: "https://news.ycombinator.com/" }],
      })
    ).toString("base64");

    fs.writeFileSync(
      path.join(tmpDir, "icloud.json"),
      JSON.stringify({
        device: "local-mac-id",
        values: {
          spaces: spacesPayload,
          settings: settingsPayload,
          "pins.shared": sharedPinsPayload,
          "device.local-mac-id": remotePayload,
          "device.remote-iphone-id": remotePayload,
        },
      })
    );

    const darkHash = "0123456789abcdef0123456789abcdef";
    const lightHash = "fedcba9876543210fedcba9876543210";
    fs.writeFileSync(path.join(tmpDir, "icons", `${darkHash}.png`), "fake-png");
    fs.writeFileSync(path.join(tmpDir, "icons", `${lightHash}.svg`), "<svg/>");
    fs.writeFileSync(
      path.join(tmpDir, "icons", "pages.json"),
      JSON.stringify({
        "www.searchbrowser.app": { "/": { dark: darkHash, light: lightHash, seen: 1795807567 } },
        "evil.test": { "/": { dark: "../../etc/passwd", seen: 1795807567 } },
      })
    );

    const history = readHistory(tmpDir);
    assert.equal(history.length, 2);
    assert.equal(history[0].title, "Search Browser Updated");
    assert.equal(history[0].visitCount, 8);
    assert.equal(history[1].title, "example.com");

    const sessionTabs = readSessionTabs(tmpDir);
    assert.equal(sessionTabs.length, 3);
    assert.equal(sessionTabs[0].isActive, true);
    assert.ok(sessionTabs.some((t) => t.space === "Archive" && t.url === "https://linear.app/"));

    const bookmarks = readBookmarks(tmpDir);
    assert.equal(bookmarks.length, 3);
    assert.equal(bookmarks[0].folderLabel, "Work");
    assert.equal(bookmarks[1].folderLabel, "Work / Docs");
    assert.equal(bookmarks[2].folderLabel, "Bookmarks");
    assert.equal(flattenBookmarkNodes(bookmarksFixture).length, 3);

    const spaces = readSpaces(tmpDir);
    assert.equal(spaces.length, 3);
    assert.equal(spaces[1].name, "Work");

    const pins = readPinnedTabs(tmpDir);
    assert.equal(pins.length, 2);
    assert.equal(pins[0].spaceName, "Work");
    assert.equal(pins[0].folderName, "Daily");
    assert.equal(pins[1].spaceName, "Shared");

    const settings = readBrowserSettings(tmpDir);
    assert.equal(settings?.engine, "kagi");

    const remotes = readRemoteDeviceTabs(tmpDir);
    assert.equal(remotes.length, 1);
    assert.equal(remotes[0].deviceName, "iPhone");
    assert.equal(remotes[0].tabs[0].url, "https://news.ycombinator.com/");

    const snapshot = readLocalBrowserSnapshot(tmpDir);
    assert.equal(snapshot.history.length, 2);
    assert.equal(snapshot.bookmarks.length, 3);
    assert.equal(snapshot.pins.length, 2);

    // Non-www URL should resolve www.-keyed icon entry, respecting dark/light & SVG fallback
    assert.equal(
      resolveLocalFaviconPath("https://searchbrowser.app/docs", "dark", tmpDir),
      path.join(tmpDir, "icons", `${darkHash}.png`)
    );
    assert.equal(
      resolveLocalFaviconPath("https://searchbrowser.app/docs", "light", tmpDir),
      path.join(tmpDir, "icons", `${lightHash}.svg`)
    );
    // Reject path-traversal hashes
    assert.equal(resolveLocalFaviconPath("https://evil.test/", "dark", tmpDir), null);

    assert.deepEqual(decodeBase64Json(settingsPayload), { engine: "kagi", look: "system" });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
