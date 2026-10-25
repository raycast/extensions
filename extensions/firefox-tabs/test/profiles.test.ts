import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
  AVATAR_ICONS,
  DEFAULT_AVATAR_ICON,
  PROFILE_COLOR_COUNT,
  labelHosts,
  labelProfile,
  loadProfiles,
  mergeProfiles,
  parseProfilesIni,
  parseStoreRows,
  profileDirName,
} from "../src/lib/profiles.ts";

const FF = "/Users/me/Library/Application Support/Firefox";

const PROFILES_INI = `[General]
StartWithLastProfile=1
Version=2

[Profile0]
Name=default-release
IsRelative=1
Path=Profiles/o13c2gh4.default-release
StoreID=cd124d02

[Install2656FF1E876E9973]
Default=Profiles/o13c2gh4.default-release
Locked=1

[Profile1]
Name=work
IsRelative=0
Path=/Volumes/External/work-profile
Default=1
`;

describe("parseProfilesIni", () => {
  test("reads relative and absolute profiles, skipping install sections", () => {
    assert.deepEqual(parseProfilesIni(PROFILES_INI, FF), [
      { path: `${FF}/Profiles/o13c2gh4.default-release`, name: "default-release", avatar: null },
      { path: "/Volumes/External/work-profile", name: "work", avatar: null },
    ]);
  });

  test("handles CRLF line endings and a missing name", () => {
    const text = "[Profile0]\r\nIsRelative=1\r\nPath=Profiles/abcd1234.Personal\r\n";
    assert.deepEqual(parseProfilesIni(text, FF), [
      { path: `${FF}/Profiles/abcd1234.Personal`, name: "Personal", avatar: null },
    ]);
  });

  test("returns nothing for an empty file", () => {
    assert.deepEqual(parseProfilesIni("", FF), []);
  });
});

describe("parseStoreRows", () => {
  test("resolves relative paths and keeps names and avatars", () => {
    const json = JSON.stringify([
      { path: "Profiles/o13c2gh4.default-release", name: "Original profile", avatar: "book" },
      { path: "Profiles/rgS3yvsW.Profile 1", name: "Ikea - DA", avatar: "hammer" },
    ]);
    assert.deepEqual(parseStoreRows(json, FF), [
      { path: `${FF}/Profiles/o13c2gh4.default-release`, name: "Original profile", avatar: "book" },
      { path: `${FF}/Profiles/rgS3yvsW.Profile 1`, name: "Ikea - DA", avatar: "hammer" },
    ]);
  });

  test("falls back to the directory name and drops rows without a path", () => {
    const json = JSON.stringify([{ path: "Profiles/zzzz9999.Side", name: "", avatar: null }, { name: "No path" }]);
    assert.deepEqual(parseStoreRows(json, FF), [{ path: `${FF}/Profiles/zzzz9999.Side`, name: "Side", avatar: null }]);
  });

  test("returns nothing for empty output", () => {
    assert.deepEqual(parseStoreRows("", FF), []);
  });
});

describe("profileDirName", () => {
  test("drops the random prefix Firefox adds", () => {
    assert.equal(profileDirName(`${FF}/Profiles/rgS3yvsW.Profile 1`), "Profile 1");
    assert.equal(profileDirName(`${FF}/Profiles/o13c2gh4.default-release`), "default-release");
  });

  test("keeps names without a prefix", () => {
    assert.equal(profileDirName("/Volumes/External/work-profile"), "work-profile");
    assert.equal(profileDirName("/x/trailing."), "trailing.");
  });
});

describe("mergeProfiles", () => {
  test("puts store profiles first and adds ini-only profiles after", () => {
    const store = [{ path: "/a", name: "A from store", avatar: "book" }];
    const ini = [
      { path: "/a", name: "a", avatar: null },
      { path: "/b", name: "b", avatar: null },
    ];
    assert.deepEqual(mergeProfiles(store, ini), [
      { path: "/a", name: "A from store", avatar: "book" },
      { path: "/b", name: "b", avatar: null },
    ]);
  });
});

describe("labelProfile", () => {
  const profiles = [
    { path: "/p/a", name: "Original profile", avatar: "book" },
    { path: "/p/b", name: "Ikea - DA", avatar: "hammer" },
    { path: "/p/c", name: "Custom", avatar: "/p/c/avatar.png" },
    { path: "/p/d", name: "Unknown avatar", avatar: "something-new" },
  ];

  test("uses the profile's name, mapped avatar icon and position for colour", () => {
    assert.deepEqual(labelProfile("/p/b", profiles), { name: "Ikea - DA", icon: { name: "Hammer" }, colorIndex: 1 });
  });

  test("matches a profile path given with a trailing slash", () => {
    assert.equal(labelProfile("/p/a/", profiles)?.name, "Original profile");
  });

  test("uses a custom avatar image path as is", () => {
    assert.deepEqual(labelProfile("/p/c", profiles)?.icon, { path: "/p/c/avatar.png" });
  });

  test("uses the default icon for an avatar with no match", () => {
    assert.deepEqual(labelProfile("/p/d", profiles)?.icon, { name: DEFAULT_AVATAR_ICON });
  });

  test("labels an unknown profile from its directory name", () => {
    assert.deepEqual(labelProfile("/elsewhere/abcd1234.Travel", profiles), {
      name: "Travel",
      icon: { name: DEFAULT_AVATAR_ICON },
      colorIndex: profiles.length % PROFILE_COLOR_COUNT,
    });
  });

  test("returns null when the host could not tell which profile it serves", () => {
    assert.equal(labelProfile(null, profiles), null);
  });

  test("wraps colours around the palette", () => {
    const many = Array.from({ length: PROFILE_COLOR_COUNT + 1 }, (_, i) => ({
      path: `/p/${i}`,
      name: `P${i}`,
      avatar: null,
    }));
    assert.equal(labelProfile(`/p/${PROFILE_COLOR_COUNT}`, many)?.colorIndex, 0);
  });
});

describe("AVATAR_ICONS", () => {
  test("only names icons that exist in Raycast", () => {
    // Read the Icon enum from the type definitions rather than importing
    // @raycast/api, which only runs inside Raycast.
    const typesPath = createRequire(import.meta.url).resolve("@raycast/api/types/index.d.ts");
    const types = readFileSync(typesPath, "utf-8");
    for (const icon of [...Object.values(AVATAR_ICONS), DEFAULT_AVATAR_ICON]) {
      assert.match(types, new RegExp(`^\\s+${icon} = "`, "m"), `Icon.${icon} exists`);
    }
  });
});

describe("loadProfiles", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "raycast-firefox-profiles-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("returns nothing when Firefox has no profiles", async () => {
    assert.deepEqual(await loadProfiles(dir), []);
  });

  test("reads names and avatars from the profile group store", async (t) => {
    try {
      execFileSync("/usr/bin/sqlite3", ["-version"], { stdio: "ignore" });
    } catch {
      t.skip("sqlite3 is not available");
      return;
    }
    writeFileSync(
      join(dir, "profiles.ini"),
      "[Profile0]\nName=default\nIsRelative=1\nPath=Profiles/aaaa1111.default\n"
    );
    mkdirSync(join(dir, "Profile Groups"));
    execFileSync("/usr/bin/sqlite3", [
      join(dir, "Profile Groups", "store.sqlite"),
      "CREATE TABLE Profiles (id INTEGER PRIMARY KEY, path TEXT, name TEXT, avatar TEXT);" +
        "INSERT INTO Profiles (id, path, name, avatar) VALUES (2, 'Profiles/bbbb2222.Profile 1', 'Ikea - DA', 'hammer');" +
        "INSERT INTO Profiles (id, path, name, avatar) VALUES (1, 'Profiles/cccc3333.default-release', 'Original profile', 'book');",
    ]);

    assert.deepEqual(await loadProfiles(dir), [
      { path: join(dir, "Profiles/cccc3333.default-release"), name: "Original profile", avatar: "book" },
      { path: join(dir, "Profiles/bbbb2222.Profile 1"), name: "Ikea - DA", avatar: "hammer" },
      { path: join(dir, "Profiles/aaaa1111.default"), name: "default", avatar: null },
    ]);
  });
});

describe("labelHosts", () => {
  const profiles = [
    { path: "/p/a", name: "Original profile", avatar: "book" },
    { path: "/p/b", name: "Ikea - DA", avatar: "hammer" },
  ];
  const host = (key: string, profilePath: string | null, firefoxPid: number | null = Number(key), port = 26394) => ({
    key,
    profilePath,
    firefoxPid,
    port,
  });

  test("labels nothing with a single profile, so tabs keep the plain window tag", () => {
    assert.equal(labelHosts([host("1", "/p/a"), host("1", "/p/a")], profiles).size, 0);
  });

  test("labels each host with its profile", () => {
    const labels = labelHosts([host("1", "/p/a"), host("2", "/p/b"), host("1", "/p/a")], profiles);
    assert.deepEqual(
      [...labels].map(([key, label]) => [key, label.name, label.colorIndex]),
      [
        ["1", "Original profile", 0],
        ["2", "Ikea - DA", 1],
      ]
    );
  });

  test("labels a host that can't name its profile by its Firefox process", () => {
    const labels = labelHosts([host("1", "/p/a"), host("port-26395", null, null, 26395)], profiles);
    assert.deepEqual(labels.get("port-26395"), {
      name: "Firefox (process 26395)",
      icon: { name: DEFAULT_AVATAR_ICON },
      colorIndex: 1,
    });
  });
});
