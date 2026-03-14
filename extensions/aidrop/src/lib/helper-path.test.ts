import test from "node:test";
import assert from "node:assert/strict";

import { getFinderCopyHelperPath } from "./helper-path";

test("getFinderCopyHelperPath resolves the helper from Raycast assetsPath", () => {
  assert.equal(
    getFinderCopyHelperPath(
      "/Users/jinmu/Library/Application Support/com.raycast.macos/extensions/aidrop/assets",
    ),
    "/Users/jinmu/Library/Application Support/com.raycast.macos/extensions/aidrop/assets/finder-copy-files",
  );
});
