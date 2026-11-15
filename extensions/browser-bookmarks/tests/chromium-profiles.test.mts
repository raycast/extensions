import assert from "node:assert/strict";
import test from "node:test";
import { basename, dirname } from "node:path";

import {
  getChromiumProfiles,
  isFileAccessPermissionError,
  type ChromiumFileSystem,
} from "../src/utils/chromiumProfiles.ts";

function fileError(code: string) {
  return Object.assign(new Error(code), { code });
}

function directory(name: string) {
  return { name, isDirectory: () => true };
}

function isDefaultBookmarksFile(path: string) {
  return basename(path) === "Bookmarks" && basename(dirname(path)) === "Default";
}

test("reads profiles from Chromium Local State", async () => {
  const fileSystem: ChromiumFileSystem = {
    readFile: async () =>
      JSON.stringify({ profile: { info_cache: { Default: { name: "Personal" } }, last_used: "Default" } }),
    readdir: async () => [],
    stat: async (path) => {
      if (isDefaultBookmarksFile(path)) return {};
      throw fileError("ENOENT");
    },
  };

  assert.deepEqual(await getChromiumProfiles("/Chrome", fileSystem), {
    profiles: [{ path: "Default", name: "Personal" }],
    defaultProfile: "Default",
  });
});

test("falls back to profile directories if Local State cannot be read", async () => {
  const fileSystem: ChromiumFileSystem = {
    readFile: async () => {
      throw fileError("EPERM");
    },
    readdir: async () => [directory("Default")],
    stat: async (path) => {
      if (isDefaultBookmarksFile(path)) return {};
      throw fileError("ENOENT");
    },
  };

  assert.deepEqual(await getChromiumProfiles("/Chrome", fileSystem), {
    profiles: [{ path: "Default", name: "Default" }],
    defaultProfile: "Default",
  });
});

test("falls back to profile directories when Local State lists no profiles", async () => {
  const fileSystem: ChromiumFileSystem = {
    readFile: async () => JSON.stringify({ profile: { info_cache: {} } }),
    readdir: async () => [directory("Default")],
    stat: async (path) => {
      if (isDefaultBookmarksFile(path)) return {};
      throw fileError("ENOENT");
    },
  };

  assert.deepEqual(await getChromiumProfiles("/Chrome", fileSystem), {
    profiles: [{ path: "Default", name: "Default" }],
    defaultProfile: "Default",
  });
});

test("does not turn denied profile directory access into an empty result", async () => {
  const fileSystem: ChromiumFileSystem = {
    readFile: async () => {
      throw fileError("EPERM");
    },
    readdir: async () => {
      throw fileError("EPERM");
    },
    stat: async () => {
      throw fileError("ENOENT");
    },
  };

  await assert.rejects(getChromiumProfiles("/Chrome", fileSystem), { code: "EPERM" });
});

test("does not skip a profile when checking its bookmark file is denied", async () => {
  const fileSystem: ChromiumFileSystem = {
    readFile: async () => JSON.stringify({ profile: { info_cache: { Default: { name: "Personal" } } } }),
    readdir: async () => [],
    stat: async () => {
      throw fileError("EACCES");
    },
  };

  await assert.rejects(getChromiumProfiles("/Chrome", fileSystem), { code: "EACCES" });
});

test("keeps a missing Chromium profile directory as an empty result", async () => {
  const fileSystem: ChromiumFileSystem = {
    readFile: async () => {
      throw fileError("ENOENT");
    },
    readdir: async () => {
      throw fileError("ENOENT");
    },
    stat: async () => {
      throw fileError("ENOENT");
    },
  };

  assert.deepEqual(await getChromiumProfiles("/missing/Chrome", fileSystem), { profiles: [], defaultProfile: "" });
});

test("identifies filesystem permission errors without treating missing files as denied access", () => {
  assert.equal(isFileAccessPermissionError(fileError("EPERM")), true);
  assert.equal(isFileAccessPermissionError(fileError("EACCES")), true);
  assert.equal(isFileAccessPermissionError(new Error("EPERM: operation not permitted, scandir")), true);
  assert.equal(isFileAccessPermissionError({ message: "permission denied" }), true);
  assert.equal(isFileAccessPermissionError(fileError("ENOENT")), false);
  assert.equal(isFileAccessPermissionError(new Error("Unexpected file error")), false);
});
