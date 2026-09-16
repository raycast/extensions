import assert from "node:assert/strict";
import { test } from "node:test";
import { parseHostLine } from "./fleet-hosts.ts";

test("a bare hostname is a host with no port", () => {
	const host = parseHostLine("server.example");
	assert.equal(host?.name, "server.example");
	assert.equal(host?.port, undefined);
});

test("host:port is split", () => {
	const host = parseHostLine("server.example:2222");
	assert.equal(host?.name, "server.example");
	assert.equal(host?.port, "2222");
});

test("--profile is picked up without becoming part of the host", () => {
	const host = parseHostLine("server.example --profile lab");
	assert.equal(host?.name, "server.example");
	assert.equal(host?.profile, "lab");
});

test("an IPv6 address is not cut at a colon", () => {
	// The bug fleet.sh already carries a comment about: fe80::1 read as host
	// "fe80:" on port 1, and ssh then tried to reach a machine that is not there.
	const host = parseHostLine("fe80::1");
	assert.equal(host?.name, "fe80::1");
	assert.equal(host?.port, undefined);
});

test("the bracketed IPv6 form keeps address and port apart", () => {
	const host = parseHostLine("[fe80::1]:22");
	assert.equal(host?.name, "fe80::1");
	assert.equal(host?.port, "22");
});

test("a comment is not a host", () => {
	assert.equal(parseHostLine("# the lab machines"), undefined);
	assert.equal(parseHostLine("   "), undefined);
});

test("a trailing comment does not become part of the host", () => {
	const host = parseHostLine("server.example  # retired next month");
	assert.equal(host?.name, "server.example");
});

test("a colon with something other than digits after it is not a port", () => {
	const host = parseHostLine("server.example:backup");
	assert.equal(host?.name, "server.example:backup");
	assert.equal(host?.port, undefined);
});
