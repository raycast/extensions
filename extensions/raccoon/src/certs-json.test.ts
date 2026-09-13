import { test } from "node:test";
import assert from "node:assert/strict";
import {
	byUrgency,
	isRemovable,
	parseCerts,
	type Certificate,
} from "./certs-json.ts";

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
		keychain: "",
		sha256: "",
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

test("only an expired certificate in the login keychain, with a hash, can be removed", () => {
	const SHA =
		"28BC2356366BA59A498573A93284E67BC751D6FB618A7C8BA7A5D57C2E99AFD1";
	const base: Certificate = {
		name: "Apple Worldwide Developer Relations Certification Authority",
		issuer: "Apple Root CA",
		expires: "Feb  7 21:48:47 2023 GMT",
		status: "expired",
		self_signed: false,
		keychain: "/Users/me/Library/Keychains/login.keychain-db",
		sha256: SHA,
	};
	assert.equal(isRemovable(base), true);
	// The System keychain is not the reader's to edit from a list.
	assert.equal(
		isRemovable({
			...base,
			keychain: "/Library/Keychains/System.keychain",
		}),
		false,
	);
	// An rcc that did not say which keychain, or the hash, gets no delete.
	assert.equal(isRemovable({ ...base, keychain: "" }), false);
	assert.equal(isRemovable({ ...base, sha256: "" }), false);
	assert.equal(isRemovable({ ...base, status: "expiring" }), false);
});
