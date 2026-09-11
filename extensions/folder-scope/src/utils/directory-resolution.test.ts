import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeDirectoryPath, resolveFallback, resolveFromSelection } from "./directory-resolution.ts";

test("empty selection resolves to null", () => {
  assert.equal(resolveFromSelection([]), null);
});

test("selected directory resolves to itself", () => {
  assert.deepEqual(resolveFromSelection([{ path: "/Users/me/Projects", isDirectory: true }]), {
    path: "/Users/me/Projects",
    source: "finder-selection",
  });
});

test("selected file resolves to its parent directory", () => {
  assert.deepEqual(resolveFromSelection([{ path: "/Users/me/Projects/readme.md", isDirectory: false }]), {
    path: "/Users/me/Projects",
    source: "finder-file-parent",
  });
});

test("trailing slashes are normalized before resolution", () => {
  assert.deepEqual(resolveFromSelection([{ path: "/Users/me/Projects/", isDirectory: true }]), {
    path: "/Users/me/Projects",
    source: "finder-selection",
  });
  assert.equal(normalizeDirectoryPath("///"), "/");
});

test("unicode and spaces in paths survive resolution", () => {
  assert.deepEqual(resolveFromSelection([{ path: "/Users/me/Ölçüm Dosyaları/veri.txt", isDirectory: false }]), {
    path: "/Users/me/Ölçüm Dosyaları",
    source: "finder-file-parent",
  });
});

test("fallback: prompt behavior always prompts", () => {
  assert.equal(
    resolveFallback({
      behavior: "prompt",
      defaultDirectory: "/tmp",
      defaultDirectoryValid: true,
      homeDirectory: "/Users/me",
    }),
    null,
  );
});

test("fallback: valid default directory is used", () => {
  assert.deepEqual(
    resolveFallback({
      behavior: "default-directory",
      defaultDirectory: "/Users/me/Notes/",
      defaultDirectoryValid: true,
      homeDirectory: "/Users/me",
    }),
    { path: "/Users/me/Notes", source: "default-directory" },
  );
});

test("fallback: missing or invalid default directory prompts instead", () => {
  assert.equal(
    resolveFallback({
      behavior: "default-directory",
      defaultDirectory: null,
      defaultDirectoryValid: false,
      homeDirectory: "/Users/me",
    }),
    null,
  );
  assert.equal(
    resolveFallback({
      behavior: "default-directory",
      defaultDirectory: "/deleted",
      defaultDirectoryValid: false,
      homeDirectory: "/Users/me",
    }),
    null,
  );
});

test("fallback: home behavior uses the home directory", () => {
  assert.deepEqual(
    resolveFallback({
      behavior: "home",
      defaultDirectory: null,
      defaultDirectoryValid: false,
      homeDirectory: "/Users/me",
    }),
    { path: "/Users/me", source: "home" },
  );
});
