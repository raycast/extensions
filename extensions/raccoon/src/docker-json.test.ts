import { test } from "node:test";
import assert from "node:assert/strict";
import { containerState, dockerTitle, parseDocker } from "./docker-json.ts";

test("a Mac without Docker is a report, not a failure", () => {
	const d = parseDocker('{"installed":false,"running":false,"images":[],"containers":[],"volumes":[],"space":[]}');
	assert.equal(d.installed, false);
	assert.equal(d.images.length, 0);
});

test("installed but not running is a third state, not the same as absent", () => {
	const d = parseDocker('{"installed":true,"running":false,"images":[],"containers":[],"volumes":[],"space":[]}');
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

test("a daemon that is down is not a Mac with nothing on it", () => {
	// bin/docker.sh prints empty lists whenever the daemon is not running, so a
	// count drawn from them says "0 containers" about a Mac that may have
	// twenty. The honest answer is that nothing could be counted.
	const down = { installed: true, running: false, images: [], containers: [], volumes: [], space: [] };
	assert.equal(dockerTitle(down), "Docker: not running");
});

test("with the daemon up the title counts what it reported", () => {
	const up = {
		installed: true,
		running: true,
		images: [{}, {}, {}],
		containers: [{}, {}],
		volumes: [],
		space: [],
	} as unknown as Parameters<typeof dockerTitle>[0];
	assert.equal(dockerTitle(up), "Docker: 2 containers, 3 images");
});

test("a Mac without Docker is named, not counted", () => {
	const none = { installed: false, running: false, images: [], containers: [], volumes: [], space: [] };
	assert.equal(dockerTitle(none), "Docker");
	assert.equal(dockerTitle(undefined), "Docker");
});
