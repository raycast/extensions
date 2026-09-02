import { test } from "node:test";
import assert from "node:assert/strict";
import { containerState, parseDocker } from "./docker-json.ts";

test("a Mac without Docker is a report, not a failure", () => {
	const d = parseDocker(
		'{"installed":false,"running":false,"images":[],"containers":[],"volumes":[],"space":[]}',
	);
	assert.equal(d.installed, false);
	assert.equal(d.images.length, 0);
});

test("installed but not running is a third state, not the same as absent", () => {
	const d = parseDocker(
		'{"installed":true,"running":false,"images":[],"containers":[],"volumes":[],"space":[]}',
	);
	assert.equal(d.installed, true);
	assert.equal(d.running, false);
});

test("lists are read, and a missing one is empty rather than undefined", () => {
	const d = parseDocker(
		'{"installed":true,"running":true,"images":[{"repository":"postgres","tag":"16","size":"400MB"}]}',
	);
	assert.equal(d.images[0].repository, "postgres");
	assert.deepEqual(d.containers, []);
});

test("container status is read as a state", () => {
	assert.equal(containerState("Up 2 hours"), "up");
	assert.equal(containerState("Exited (0) 3 days ago"), "exited");
	assert.equal(containerState("Restarting"), "other");
});
