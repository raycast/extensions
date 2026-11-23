import assert from "node:assert";
import test from "node:test";
import { isMediaEncoderInstalled } from "../src/utils/adobeApps";
import { getCommonAdobeDocumentPaths, getMountedDrives } from "../src/utils/drives";

test("drives utilities", async (t) => {
  await t.test("getMountedDrives returns global and system drives", () => {
    const drives = getMountedDrives();
    assert.ok(Array.isArray(drives));
    assert.ok(drives.some((d) => d.id === "global"));
    assert.ok(drives.some((d) => d.id === "system"));
  });

  await t.test("getCommonAdobeDocumentPaths returns string array without errors", () => {
    const paths = getCommonAdobeDocumentPaths();
    assert.ok(Array.isArray(paths));
    for (const p of paths) {
      assert.strictEqual(typeof p, "string");
    }
  });

  await t.test("isMediaEncoderInstalled returns boolean without crashing", () => {
    const result = isMediaEncoderInstalled();
    assert.strictEqual(typeof result, "boolean");
  });
});
