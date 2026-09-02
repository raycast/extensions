import { test } from "node:test";
import assert from "node:assert/strict";
import { byUrgency, parseCerts, type Certificate } from "./certs-json.ts";

const report = (certs: unknown[]) =>
	JSON.stringify({
		counts: { total: 3, valid: 1, expiring: 1, expired: 1, self_signed: 0 },
		expiring_window_days: 30,
		certificates: certs,
		keychains: ["/Users/alex/Library/Keychains/login.keychain-db"],
	});

test("counts, window, certificates and keychains are read", () => {
	const c = parseCerts(
		report([
			{
				name: "example.com",
				issuer: "R3",
				expires: "Dec 1 2026",
				status: "valid",
				self_signed: false,
			},
		]),
	);
	assert.equal(c.counts.total, 3);
	assert.equal(c.expiring_window_days, 30);
	assert.equal(c.certificates[0].name, "example.com");
	assert.equal(c.keychains.length, 1);
});

test("an unknown status is read as valid rather than rendered raw", () => {
	const c = parseCerts(report([{ name: "x", status: "banana" }]));
	assert.equal(c.certificates[0].status, "valid");
});

test("expired sorts first, then expiring, then the rest", () => {
	const cert = (
		name: string,
		status: Certificate["status"],
	): Certificate => ({
		name,
		issuer: "",
		expires: "",
		status,
		self_signed: false,
	});
	const sorted = [
		cert("b", "valid"),
		cert("c", "expired"),
		cert("a", "expiring"),
	].sort(byUrgency);
	assert.deepEqual(
		sorted.map((c) => c.name),
		["c", "a", "b"],
	);
});

test("output that is not JSON says so", () => {
	assert.throws(() => parseCerts("-- Certificates"), /did not print JSON/);
});
