import { test } from "node:test";
import assert from "node:assert/strict";
import { isNoise, parseNetwork, primaryAddress } from "./network-json.ts";

const full = JSON.stringify({
	interfaces: [
		{ name: "lo0", family: "inet", address: "127.0.0.1", kind: "Loopback" },
		{ name: "en0", family: "inet", address: "192.168.1.42", kind: "LAN" },
		{ name: "en0", family: "inet6", address: "2001:db8::1", kind: "Other" },
	],
	dns: ["8.8.8.8", "1.1.1.1"],
	vpns: [{ name: "Office", state: "connected" }],
	proxies: [{ name: "HTTP_PROXY", value: "http://proxy:8080" }],
	firewall: { application: "enabled", pf: "Enabled" },
	connections: 74,
});

test("every section is read", () => {
	const n = parseNetwork(full);
	assert.equal(n.interfaces.length, 3);
	assert.deepEqual(n.dns, ["8.8.8.8", "1.1.1.1"]);
	assert.equal(n.vpns[0].state, "connected");
	assert.equal(n.firewall.application, "enabled");
	assert.equal(n.connections, 74);
});

test("the primary address is the routable one, not loopback", () => {
	assert.equal(primaryAddress(parseNetwork(full))?.address, "192.168.1.42");
});

test("a Mac with only loopback has no primary address to show", () => {
	const n = parseNetwork(
		'{"interfaces":[{"name":"lo0","family":"inet","address":"127.0.0.1","kind":"Loopback"}]}',
	);
	assert.equal(primaryAddress(n), null);
});

test("loopback and link-local are noise, everything else is not", () => {
	const iface = (kind: string) => ({
		name: "x",
		family: "inet" as const,
		address: "",
		kind,
	});
	assert.equal(isNoise(iface("Loopback")), true);
	assert.equal(isNoise(iface("LinkLocal")), true);
	assert.equal(isNoise(iface("LAN")), false);
});

test("an unknown vpn state is read as configured, not as connected", () => {
	const n = parseNetwork('{"vpns":[{"name":"X","state":"banana"}]}');
	assert.equal(n.vpns[0].state, "configured");
});

test("output that is not JSON says so", () => {
	assert.throws(
		() => parseNetwork("-- Network Status"),
		/did not print JSON/,
	);
});
