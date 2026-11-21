import assert from "node:assert/strict";
import test from "node:test";
import { encodeLegacySetting } from "../src/settings-value.ts";

test("migrates existing language and mode settings without changing their values", () => {
  for (const value of ["en", "ru", "auto", "paired", "manual", "zh-TW"]) {
    assert.throws(() => JSON.parse(value));
    assert.equal(JSON.parse(encodeLegacySetting(value)), value);
  }
});
test("does not encode settings twice when the command is reopened", () => {
  for (const value of ["en", "ru", "auto", "paired", "manual"]) {
    const migrated = encodeLegacySetting(value);
    assert.equal(encodeLegacySetting(migrated), migrated);
  }
});
