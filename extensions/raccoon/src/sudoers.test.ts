// Zero-dependency check: node --test src/sudoers.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDropIn, isValidUsername, SUDOERS_PATH } from "./sudoers.ts";

test("the drop-in sets a global, user-scoped time stamp", () => {
	const content = buildDropIn("eugenio", "60");
	assert.ok(content.includes("Defaults:eugenio timestamp_type=global"));
	assert.ok(content.includes("Defaults:eugenio timestamp_timeout=60"));
});

test("the permanent choice never expires", () => {
	assert.ok(buildDropIn("eugenio", "-1").includes("timestamp_timeout=-1"));
});

test("the file documents how to remove itself", () => {
	assert.ok(buildDropIn("eugenio", "60").includes(`sudo rm ${SUDOERS_PATH}`));
});

test("only sudoers-safe usernames are accepted", () => {
	assert.ok(isValidUsername("eugenio"));
	assert.ok(isValidUsername("_service-user"));
	assert.ok(!isValidUsername("eugenio ALL=(ALL) NOPASSWD: ALL"));
	assert.ok(!isValidUsername("a\nDefaults timestamp_timeout=-1"));
	assert.ok(!isValidUsername(""));
});

test("an unsafe username is refused rather than escaped", () => {
	assert.throws(
		() => buildDropIn("root ALL=(ALL) NOPASSWD: ALL", "60"),
		/Refusing to write sudoers/,
	);
});
