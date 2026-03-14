import test from "node:test";
import assert from "node:assert/strict";

import { getSourceFolderPath } from "./source-folder";

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
