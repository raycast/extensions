import assert from "node:assert/strict";
import { test } from "node:test";
import {
	keyLevel,
	parseSsh,
	problemCount,
	reason,
	sortKeys,
	type SshKey,
} from "./ssh-json.ts";

const key = (over: Partial<SshKey> = {}): SshKey => ({
	name: "id_ed25519",
	type: "ED25519",
	passphrase: true,
	public_key: true,
	perms: "600",
	perms_ok: true,
	...over,
});

test("parses the report rcc ssh --json prints", () => {
	const parsed = parseSsh(
		'{"ssh_dir_present":true,"ssh_dir_perms":"700","keys":[{"name":"id_ed25519","type":"ED25519","passphrase":false,"public_key":true,"perms":"600","perms_ok":true}]}',
	);
	assert.equal(parsed.ssh_dir_present, true);
	assert.equal(parsed.ssh_dir_perms, "700");
	assert.equal(parsed.keys[0].type, "ED25519");
	assert.equal(parsed.keys[0].passphrase, false);
});

test("a Mac with no ~/.ssh parses as an empty report, not a failure", () => {
	const parsed = parseSsh(
		'{"ssh_dir_present":false,"ssh_dir_perms":"000","keys":[]}',
	);
	assert.equal(parsed.ssh_dir_present, false);
	assert.deepEqual(parsed.keys, []);
	assert.equal(problemCount(parsed), 0);
});

test("a key with no passphrase is the worst case, whatever its permissions", () => {
	assert.equal(keyLevel(key({ passphrase: false })), "unprotected");
	// Mode 600 does not redeem it: the file is still a usable credential.
	assert.equal(
		keyLevel(key({ passphrase: false, perms: "600", perms_ok: true })),
		"unprotected",
	);
});

test("loose permissions rank above a missing .pub", () => {
	const sorted = sortKeys([
		key({ name: "b", public_key: false }),
		key({ name: "a", perms: "644", perms_ok: false }),
	]);
	assert.deepEqual(
		sorted.map((k) => k.name),
		["a", "b"],
	);
});

test("the reason names the mode that is wrong, not just that it is wrong", () => {
	assert.equal(
		reason(key({ perms: "644", perms_ok: false })),
		"mode 644, ssh requires 600",
	);
});

test("a healthy key is not counted as a problem", () => {
	assert.equal(keyLevel(key()), "ok");
	assert.equal(
		problemCount({
			ssh_dir_present: true,
			ssh_dir_perms: "700",
			keys: [key()],
		}),
		0,
	);
});
