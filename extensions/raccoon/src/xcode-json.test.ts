import { test } from "node:test";
import assert from "node:assert/strict";
import { derivedLevel, humanBytes, parseXcode } from "./xcode-json.ts";

test("a Mac without Xcode is a report, not a failure", () => {
	const x = parseXcode(
		'{"installed":false,"simulators":[],"derived_data":{"present":false,"bytes":0,"projects":0},"platforms":[],"version":null,"build":null}',
	);
	assert.equal(x.installed, false);
	assert.equal(x.version, null);
});

test("simulators carry whether they are still running", () => {
	const x = parseXcode(
		'{"installed":true,"simulators":[{"name":"iPhone 16","booted":true},{"name":"iPad","booted":false}]}',
	);
	assert.equal(x.simulators[0].booted, true);
	assert.equal(x.simulators[1].booted, false);
});

test("an empty version string reads as unknown, not as an empty label", () => {
	const x = parseXcode('{"installed":true,"version":"","build":"17F113"}');
	assert.equal(x.version, null);
	assert.equal(x.build, "17F113");
});

test("bytes are read the way a person reads them, and zero is empty", () => {
	assert.equal(humanBytes(0), "empty");
	assert.equal(humanBytes(1024), "1.0 KB");
	assert.equal(humanBytes(5 * 1024 ** 3), "5.0 GB");
	assert.equal(humanBytes(512), "512 B");
});

test("a gigabyte of cache is ordinary, ten is worth clearing", () => {
	assert.equal(derivedLevel(0), "empty");
	assert.equal(derivedLevel(2 * 1024 ** 3), "ok");
	assert.equal(derivedLevel(10 * 1024 ** 3), "large");
});

test("output that is not JSON says so", () => {
	assert.throws(() => parseXcode("-- Xcode Status"), /did not print JSON/);
});
