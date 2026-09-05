import test from "node:test";
import assert from "node:assert/strict";
import {
  getSecurityWarning,
  isMDLabelAttribute,
  isPlistDateAttribute,
  isPlistStringArrayAttribute,
  isReadOnlyBinaryAttribute,
} from "../src/utils/constants";

test("security warnings match exact and flagged attribute names", () => {
  assert.ok(getSecurityWarning("com.apple.quarantine"));
  assert.ok(getSecurityWarning("com.apple.quarantine#0083"));
  assert.equal(getSecurityWarning("com.apple.metadata:kMDItemWhereFroms"), undefined);
});

test("read-only binary policy matches exact and flagged names", () => {
  assert.equal(isReadOnlyBinaryAttribute("com.apple.macl"), true);
  assert.equal(isReadOnlyBinaryAttribute("com.apple.macl#PS"), true);
  assert.equal(isReadOnlyBinaryAttribute("com.apple.metadata:kMDLabel_ucv4rwcsx2c3lyldb7lmkwvpuy"), true);
  assert.equal(isReadOnlyBinaryAttribute("com.apple.TextEncoding"), false);
});

test("typed metadata policy contains date and string array attributes", () => {
  assert.equal(isPlistDateAttribute("com.apple.lastuseddate#PS"), true);
  assert.equal(isPlistDateAttribute("com.apple.lastuseddate"), false);
  assert.equal(isPlistStringArrayAttribute("com.apple.metadata:kMDItemWhereFroms"), true);
  assert.equal(isPlistStringArrayAttribute("com.apple.metadata:_kMDItemUserTags"), true);
});

test("MDLabel metadata is detected by dynamic suffix prefix", () => {
  assert.equal(isMDLabelAttribute("com.apple.metadata:kMDLabel_ucv4rwcsx2c3lyldb7lmkwvpuy"), true);
  assert.equal(isMDLabelAttribute("com.apple.metadata:kMDItemWhereFroms"), false);
});
