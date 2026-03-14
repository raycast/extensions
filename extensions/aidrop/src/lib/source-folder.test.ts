import test from "node:test";
import assert from "node:assert/strict";

import { getSourceFolderPath, getSourceFolderPaths } from "./source-folder";

test("getSourceFolderPath defaults to Downloads when the preference is empty", () => {
  assert.equal(
    getSourceFolderPath({}, "/Users/jinmu"),
    "/Users/jinmu/Downloads",
  );
});

test("getSourceFolderPath uses the configured directory preference", () => {
  assert.equal(
    getSourceFolderPath(
      { sourceFolder: "/Users/jinmu/Desktop" },
      "/Users/jinmu",
    ),
    "/Users/jinmu/Desktop",
  );
});

test("getSourceFolderPath expands a tilde-prefixed path", () => {
  assert.equal(
    getSourceFolderPath({ sourceFolder: "~/Documents" }, "/Users/jinmu"),
    "/Users/jinmu/Documents",
  );
});

test("getSourceFolderPaths defaults to Downloads when all preferences are empty", () => {
  assert.deepEqual(getSourceFolderPaths({}, "/Users/jinmu"), [
    "/Users/jinmu/Downloads",
  ]);
});

test("getSourceFolderPaths returns a single folder when only sourceFolder is set", () => {
  assert.deepEqual(
    getSourceFolderPaths({ sourceFolder: "~/Desktop" }, "/Users/jinmu"),
    ["/Users/jinmu/Desktop"],
  );
});

test("getSourceFolderPaths returns multiple folders in order", () => {
  assert.deepEqual(
    getSourceFolderPaths(
      {
        sourceFolder: "~/Downloads",
        sourceFolder2: "~/Desktop",
        sourceFolder3: "/tmp/uploads",
      },
      "/Users/jinmu",
    ),
    ["/Users/jinmu/Downloads", "/Users/jinmu/Desktop", "/tmp/uploads"],
  );
});

test("getSourceFolderPaths deduplicates identical paths", () => {
  assert.deepEqual(
    getSourceFolderPaths(
      { sourceFolder: "~/Downloads", sourceFolder2: "~/Downloads" },
      "/Users/jinmu",
    ),
    ["/Users/jinmu/Downloads"],
  );
});

test("getSourceFolderPaths skips empty optional folders", () => {
  assert.deepEqual(
    getSourceFolderPaths(
      { sourceFolder: "~/Downloads", sourceFolder2: "" },
      "/Users/jinmu",
    ),
    ["/Users/jinmu/Downloads"],
  );
});
