import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { atLeast, installedVersion, SHEET_URL_SINCE } from "../src/lib/version.ts";

function bundle(version: string): string {
  const app = join(mkdtempSync(join(tmpdir(), "keysi-version-")), "Keysi.app");
  mkdirSync(join(app, "Contents", "Resources", "BuiltinSheets"), { recursive: true });
  writeFileSync(
    join(app, "Contents", "Info.plist"),
    `<?xml version="1.0"?><plist><dict>\n\t<key>CFBundleShortVersionString</key>\n\t<string>${version}</string>\n</dict></plist>`,
  );
  return join(app, "Contents", "Resources", "BuiltinSheets");
}

test("reads the version out of the bundle's Info.plist", () => {
  assert.equal(installedVersion([bundle("1.0.24")]), "1.0.24");
});

test("the last directory (the preference) wins over the defaults", () => {
  assert.equal(installedVersion([bundle("1.0.20"), bundle("1.0.25")]), "1.0.25");
});

test("the copy that receives keysi:// wins over the sheet directories", () => {
  const handler = bundle("1.0.20").replace(/\/Contents\/Resources\/BuiltinSheets$/, "");
  assert.equal(installedVersion([bundle("1.0.25")], handler), "1.0.20");
});

test("no bundle means no version", () => {
  assert.equal(installedVersion([join(tmpdir(), "nowhere", "Contents", "Resources", "BuiltinSheets")]), undefined);
});

test("compares numerically, not as strings", () => {
  assert.equal(atLeast("1.0.10", "1.0.9"), true);
  assert.equal(atLeast("1.0.23", SHEET_URL_SINCE), false);
  assert.equal(atLeast("1.0.24", SHEET_URL_SINCE), true);
  assert.equal(atLeast("1.1", SHEET_URL_SINCE), true);
  assert.equal(atLeast(undefined, SHEET_URL_SINCE), false);
});
