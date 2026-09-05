import { test } from "node:test";
import assert from "node:assert/strict";
import { byInterest, exposure, parsePorts, type Port } from "./ports-json.ts";

const port = (over: Partial<Port> = {}): Port => ({
	port: "7000",
	proto: "TCP",
	pid: 1631,
	user: "alex",
	process: "ControlCenter",
	address: "*:7000",
	state: "LISTEN",
	...over,
});

test("a port list is read field by field", () => {
	const list = parsePorts(JSON.stringify([port()]));
	assert.equal(list[0].port, "7000");
	assert.equal(list[0].pid, 1631);
});

test("a wildcard address is reachable from the network", () => {
	assert.equal(exposure(port({ address: "*:7000" })), "exposed");
});

test("loopback is reachable only from this Mac", () => {
	assert.equal(exposure(port({ address: "127.0.0.1:8765" })), "local");
	assert.equal(exposure(port({ address: "[::1]:8765" })), "local");
});

test("a socket with no port bound is neither", () => {
	assert.equal(exposure(port({ port: "*", address: "*:*" })), "idle");
});

test("a listener on a real interface counts as reachable", () => {
	assert.equal(exposure(port({ address: "192.168.1.42:56122" })), "exposed");
});

test("an established connection is a conversation, not an open door", () => {
	// 81 of these on one Mac, every one an outbound connection; the old rule
	// called them reachable and offered to kill the browser and the shell.
	const outbound = port({
		address: "[2a02:b027:8011:f908::1]:58508",
		state: "ESTABLISHED",
		process: "claude",
	});
	assert.equal(exposure(outbound), "connected");
	assert.equal(
		exposure(port({ address: "127.0.0.1:52000", state: "CLOSE_WAIT" })),
		"connected",
	);
	// UDP has no state, so a wildcard UDP socket stays a door.
	assert.equal(
		exposure(port({ proto: "UDP", address: "*:5353", state: "" })),
		"exposed",
	);
});

test("exposed sorts before local, and numbers sort as numbers", () => {
	const sorted = [
		port({ port: "9000", address: "127.0.0.1:9000" }),
		port({ port: "443", address: "10.0.0.5:443", state: "ESTABLISHED" }),
		port({ port: "80", address: "*:80" }),
		port({ port: "*", address: "*:*" }),
		port({ port: "22", address: "*:22" }),
	].sort(byInterest);
	assert.deepEqual(
		sorted.map((p) => p.port),
		["22", "80", "9000", "443", "*"],
	);
});

test("output that is not a list of ports says so", () => {
	assert.throws(() => parsePorts("-- Network Ports"), /did not print JSON/);
	assert.throws(
		() => parsePorts("{}"),
		/rcc ports printed JSON, but not a list/,
	);
	assert.throws(() => parsePorts("[{}]"), /Port 1 is not shaped/);
});
