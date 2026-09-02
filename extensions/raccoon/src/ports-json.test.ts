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

test("an address on a real interface counts as reachable", () => {
	assert.equal(exposure(port({ address: "192.168.1.42:56122" })), "exposed");
});

test("exposed sorts before local, and numbers sort as numbers", () => {
	const sorted = [
		port({ port: "9000", address: "127.0.0.1:9000" }),
		port({ port: "80", address: "*:80" }),
		port({ port: "*", address: "*:*" }),
		port({ port: "22", address: "*:22" }),
	].sort(byInterest);
	assert.deepEqual(
		sorted.map((p) => p.port),
		["22", "80", "9000", "*"],
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
