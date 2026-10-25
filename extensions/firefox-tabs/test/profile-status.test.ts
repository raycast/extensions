import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  EXTENSION_ID,
  type ExtensionState,
  firefoxExecutableFor,
  isFirefoxExecutable,
  lastFirefoxExecutable,
  openInProfile,
  parseRunningProfiles,
  profileStatuses,
  profilesNeedingSetup,
  readExtensionState,
  sameSetup,
} from "../src/lib/profile-status.ts";

const PROFILES = "/Users/me/Library/Application Support/Firefox/Profiles";
const A = `${PROFILES}/aaaa1111.default-release`;
const B = `${PROFILES}/bbbb2222.Profile 1`;
const C = `${PROFILES}/cccc3333.default`;

const extensionsJson = (addons: object[]) => () => JSON.stringify({ schemaVersion: 37, addons });

describe("readExtensionState", () => {
  test("installed when the add-on is active", () => {
    const read = extensionsJson([
      { id: "other@example.com", active: true },
      { id: EXTENSION_ID, active: true },
    ]);
    assert.equal(readExtensionState(A, read), "installed");
  });

  test("disabled when the add-on is present but inactive", () => {
    assert.equal(readExtensionState(A, extensionsJson([{ id: EXTENSION_ID, active: false }])), "disabled");
  });

  test("missing when the add-on is absent or hidden", () => {
    assert.equal(readExtensionState(A, extensionsJson([{ id: "other@example.com", active: true }])), "missing");
    assert.equal(
      readExtensionState(A, extensionsJson([{ id: EXTENSION_ID, active: true, visible: false }])),
      "missing"
    );
    assert.equal(
      readExtensionState(A, () => JSON.stringify({})),
      "missing"
    );
  });

  test("unknown when extensions.json is missing or unreadable", () => {
    const missing = () => {
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    };
    assert.equal(readExtensionState(A, missing), "unknown");
    assert.equal(
      readExtensionState(A, () => "{truncated"),
      "unknown"
    );
  });

  test("reads extensions.json from the profile directory", () => {
    let readPath = "";
    readExtensionState(A, (file) => {
      readPath = file;
      return "{}";
    });
    assert.equal(readPath, `${A}/extensions.json`);
  });
});

describe("parseRunningProfiles", () => {
  const output = [
    "p99313",
    `n${A}/.parentlock`,
    "n/Users/me/Library/Caches/Mozilla/updates/Applications/Firefox/.parentlock",
    `n${A}/places.sqlite`,
    "p78957",
    `n${B}/.parentlock`,
    "",
  ].join("\n");
  const isProfile = (file: string) => file === `${A}/prefs.js` || file === `${B}/prefs.js`;

  test("maps each locked profile to the PID holding the lock", () => {
    assert.deepEqual(
      parseRunningProfiles(output, isProfile),
      new Map([
        [A, 99313],
        [B, 78957],
      ])
    );
  });

  test("skips .parentlock files outside a profile", () => {
    assert.deepEqual(
      parseRunningProfiles(output, () => false),
      new Map()
    );
  });

  test("ignores names before the first process line", () => {
    assert.deepEqual(
      parseRunningProfiles(`n${A}/.parentlock\n`, () => true),
      new Map()
    );
  });
});

describe("profileStatuses", () => {
  const profiles = [
    { path: A, name: "Original profile", avatar: "book" },
    { path: B, name: "Ikea - DA", avatar: "hammer" },
    { path: C, name: "default", avatar: null },
  ];
  const states =
    (map: Record<string, ExtensionState>) =>
    (path: string): ExtensionState =>
      map[path] ?? "unknown";

  test("connected wins regardless of what extensions.json says", () => {
    const [a] = profileStatuses(profiles, new Map([[A, 1]]), [A], states({ [A]: "unknown" }));
    assert.equal(a.state, "connected");
    assert.equal(a.firefoxPid, 1);
  });

  test("a running profile without the extension needs it installed", () => {
    const result = profileStatuses(profiles, new Map([[B, 2]]), [], states({ [B]: "missing" }));
    assert.equal(result[1].state, "needs-install");
  });

  test("a running profile that has never written extensions.json also needs it installed", () => {
    const result = profileStatuses(profiles, new Map([[B, 2]]), [], states({}));
    assert.equal(result[1].state, "needs-install");
  });

  test("a running profile with the extension turned off is disabled", () => {
    const result = profileStatuses(profiles, new Map([[B, 2]]), [], states({ [B]: "disabled" }));
    assert.equal(result[1].state, "disabled");
  });

  test("a running profile with the extension but no host is not connected", () => {
    const result = profileStatuses(profiles, new Map([[B, 2]]), [], states({ [B]: "installed" }));
    assert.equal(result[1].state, "not-connected");
  });

  test("profiles that aren't running are not-running, whatever their extension state", () => {
    const result = profileStatuses(profiles, new Map(), [], states({ [A]: "installed", [B]: "missing" }));
    assert.deepEqual(
      result.map((s) => s.state),
      ["not-running", "not-running", "not-running"]
    );
  });

  test("matches a connected path given with a trailing slash", () => {
    const [a] = profileStatuses(profiles, new Map([[A, 1]]), [`${A}/`, null], states({}));
    assert.equal(a.state, "connected");
  });

  test("a host that can't name its profile counts as serving running profiles with the extension", () => {
    const result = profileStatuses(
      profiles,
      new Map([
        [A, 1],
        [B, 2],
      ]),
      [null],
      states({ [A]: "installed", [B]: "missing" })
    );
    assert.deepEqual(
      result.map((s) => s.state),
      ["connected", "needs-install", "not-running"]
    );
  });

  test("adds running profiles that Firefox's profile lists don't know about", () => {
    const extra = "/tmp/scratch-profile";
    const result = profileStatuses(profiles, new Map([[extra, 9]]), [], states({ [extra]: "missing" }));
    assert.equal(result.length, 4);
    assert.deepEqual(result[3].profile, { path: extra, name: "scratch-profile", avatar: null });
    assert.equal(result[3].state, "needs-install");
  });
});

describe("profilesNeedingSetup", () => {
  test("keeps running profiles that aren't delivering tabs", () => {
    const profile = { path: A, name: "A", avatar: null };
    const statuses = (["connected", "needs-install", "disabled", "not-connected", "not-running"] as const).map(
      (state) => ({ profile, firefoxPid: 1, extension: "unknown" as const, state })
    );
    assert.deepEqual(
      profilesNeedingSetup(statuses).map((s) => s.state),
      ["needs-install", "disabled", "not-connected"]
    );
  });
});

describe("isFirefoxExecutable", () => {
  test("recognises Firefox, Developer Edition and copies outside /Applications", () => {
    assert.equal(isFirefoxExecutable("/Applications/Firefox.app/Contents/MacOS/firefox\n"), true);
    assert.equal(
      isFirefoxExecutable("/Users/me/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox"),
      true
    );
  });

  test("rejects other processes and helpers", () => {
    assert.equal(isFirefoxExecutable("/sbin/launchd"), false);
    assert.equal(
      isFirefoxExecutable(
        "/Applications/Firefox.app/Contents/MacOS/plugin-container.app/Contents/MacOS/plugin-container"
      ),
      false
    );
    assert.equal(isFirefoxExecutable(""), false);
  });
});

describe("lastFirefoxExecutable", () => {
  test("reads the Firefox a profile last ran with from compatibility.ini", () => {
    const ini =
      "[Compatibility]\nLastVersion=158.0.1\nLastPlatformDir=/Applications/Firefox Nightly.app/Contents/Resources\nLastAppDir=/x\n";
    assert.equal(
      lastFirefoxExecutable(A, () => ini),
      "/Applications/Firefox Nightly.app/Contents/MacOS/firefox"
    );
  });

  test("returns null without compatibility.ini or a usable LastPlatformDir", () => {
    assert.equal(
      lastFirefoxExecutable(A, () => {
        throw new Error("ENOENT");
      }),
      null
    );
    assert.equal(
      lastFirefoxExecutable(A, () => "[Compatibility]\nLastPlatformDir=/usr/lib/firefox\n"),
      null
    );
  });
});

describe("firefoxExecutableFor", () => {
  const nightly = "/Applications/Firefox Nightly.app/Contents/MacOS/firefox";
  const regular = "/Applications/Firefox.app/Contents/MacOS/firefox";
  const none = () => null;

  test("uses the executable the profile is running from", () => {
    const exe = firefoxExecutableFor(78957, A, [99313], {
      executable: (pid) => (pid === 78957 ? nightly : regular),
      exists: () => false,
      lastUsed: none,
    });
    assert.equal(exe, nightly);
  });

  test("for a profile that isn't running, uses the Firefox it last ran with", () => {
    const exe = firefoxExecutableFor(null, A, [99313], {
      executable: () => nightly,
      exists: () => true,
      lastUsed: () => regular,
    });
    assert.equal(exe, regular);
  });

  test("prefers a standard install over another running profile's Firefox, so a release profile isn't opened in Nightly", () => {
    const exe = firefoxExecutableFor(null, A, [99313], {
      executable: () => nightly,
      exists: (p) => p === regular,
      defaults: [regular],
      lastUsed: none,
    });
    assert.equal(exe, regular);
  });

  test("uses another running profile's Firefox when nothing else is found", () => {
    const exe = firefoxExecutableFor(null, A, [99313], {
      executable: () => nightly,
      exists: () => false,
      lastUsed: none,
    });
    assert.equal(exe, nightly);
  });

  test("returns null when Firefox can't be found", () => {
    assert.equal(firefoxExecutableFor(null, A, [], { exists: () => false, lastUsed: none }), null);
  });

  test("finds Developer Edition or Nightly when it is the only Firefox installed", () => {
    const dev = "/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox";
    assert.equal(firefoxExecutableFor(null, A, [], { exists: (p) => p === dev, lastUsed: none }), dev);
    const nightly = "/Applications/Firefox Nightly.app/Contents/MacOS/firefox";
    assert.equal(firefoxExecutableFor(null, A, [], { exists: (p) => p === nightly, lastUsed: none }), nightly);
  });
});

describe("openInProfile", () => {
  function fakeSpawn(outcome: "spawn" | Error) {
    const calls: unknown[][] = [];
    let unrefs = 0;
    const run = ((...args: unknown[]) => {
      calls.push(args);
      const handlers: Record<string, (arg?: unknown) => void> = {};
      const child = {
        once: (event: string, fn: (arg?: unknown) => void) => {
          handlers[event] = fn;
          return child;
        },
        unref: () => void unrefs++,
      };
      queueMicrotask(() => (outcome === "spawn" ? handlers.spawn?.() : handlers.error?.(outcome)));
      return child;
    }) as unknown as Parameters<typeof openInProfile>[3];
    return { run, calls, unrefs: () => unrefs };
  }

  test("starts Firefox's executable with the profile and URL, detached from Raycast", async () => {
    const { run, calls, unrefs } = fakeSpawn("spawn");
    await openInProfile(B, "https://addons.mozilla.org/x/", "/Applications/Firefox.app/Contents/MacOS/firefox", run);
    assert.deepEqual(calls, [
      [
        "/Applications/Firefox.app/Contents/MacOS/firefox",
        ["--profile", B, "https://addons.mozilla.org/x/"],
        { detached: true, stdio: "ignore" },
      ],
    ]);
    assert.equal(unrefs(), 1);
  });

  test("passes only the profile when there is no URL", async () => {
    const { run, calls } = fakeSpawn("spawn");
    await openInProfile(B, undefined, "/x.app/Contents/MacOS/firefox", run);
    assert.deepEqual(calls[0][1], ["--profile", B]);
  });

  test("rejects instead of crashing when the executable can't be started", async () => {
    const { run } = fakeSpawn(Object.assign(new Error("spawn ENOENT"), { code: "ENOENT" }));
    await assert.rejects(openInProfile(B, undefined, "/missing.app/Contents/MacOS/firefox", run), /ENOENT/);
  });

  test("rejects when Firefox can't be found at all", async () => {
    await assert.rejects(openInProfile(B, undefined, null), /couldn't be found/);
  });
});

describe("sameSetup", () => {
  const profile = { path: "/p/a", name: "A", avatar: null };
  const status = (state: "connected" | "needs-install") => ({
    profile,
    firefoxPid: 1,
    extension: "missing" as const,
    state,
  });

  test("treats an identical re-check as unchanged, so the list doesn't re-render", () => {
    assert.equal(
      sameSetup(
        { statuses: [status("connected")], profiles: [profile] },
        { statuses: [status("connected")], profiles: [profile] }
      ),
      true
    );
  });

  test("notices a profile whose state changed", () => {
    assert.equal(
      sameSetup(
        { statuses: [status("connected")], profiles: [profile] },
        { statuses: [status("needs-install")], profiles: [profile] }
      ),
      false
    );
  });

  test("notices a profile that started or quit", () => {
    assert.equal(
      sameSetup({ statuses: [status("connected")], profiles: [profile] }, { statuses: [], profiles: [profile] }),
      false
    );
  });
});
