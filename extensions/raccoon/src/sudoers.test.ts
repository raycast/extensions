// Zero-dependency check: node --test src/sudoers.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDropIn, install, isValidUsername, SUDOERS_PATH, uninstall } from "./sudoers.ts";

test("the drop-in sets a global, user-scoped time stamp", () => {
	const content = buildDropIn("eugenio", "60");
	assert.ok(content.includes("Defaults:eugenio timestamp_type=global"));
	assert.ok(content.includes("Defaults:eugenio timestamp_timeout=60"));
});

test("the permanent choice never expires", () => {
	assert.ok(buildDropIn("eugenio", "-1").includes("timestamp_timeout=-1"));
});

test("the file documents how to remove itself", () => {
	assert.ok(buildDropIn("eugenio", "60").includes(`sudo rm ${SUDOERS_PATH}`));
});

test("only sudoers-safe usernames are accepted", () => {
	assert.ok(isValidUsername("eugenio"));
	assert.ok(isValidUsername("_service-user"));
	assert.ok(!isValidUsername("eugenio ALL=(ALL) NOPASSWD: ALL"));
	assert.ok(!isValidUsername("a\nDefaults timestamp_timeout=-1"));
	assert.ok(!isValidUsername(""));
});

test("an unsafe username is refused rather than escaped", () => {
	assert.throws(() => buildDropIn("root ALL=(ALL) NOPASSWD: ALL", "60"), /Refusing to write sudoers/);
});

/** Records what would have run, instead of running it. */
function recorder() {
	const calls: { file: string; args: string[] }[] = [];
	return {
		calls,
		run: async (file: string, args: string[]) => {
			calls.push({ file, args });
		},
	};
}

test("the file is checked by visudo before anything is installed as root", async () => {
	// A malformed file in /etc/sudoers.d breaks sudo for the whole machine, so
	// the order here is the safety property, not a detail.
	const { calls, run } = recorder();
	await install("60", run);
	assert.equal(calls.length, 2);
	assert.equal(calls[0].file, "/usr/sbin/visudo");
	assert.deepEqual(calls[0].args.slice(0, 2), ["-c", "-f"]);
	assert.equal(calls[1].file, "/usr/bin/sudo");
});

test("the drop-in lands as 0440 root:wheel, never with whatever bits it had", async () => {
	const { calls, run } = recorder();
	await install("-1", run);
	const install_ = calls[1].args;
	assert.equal(install_[0], "/usr/bin/install");
	assert.deepEqual(install_.slice(1, 7), ["-m", "0440", "-o", "root", "-g", "wheel"]);
	assert.equal(install_[install_.length - 1], SUDOERS_PATH);
});

test("visudo and install are handed the same staged file", async () => {
	const { calls, run } = recorder();
	await install("60", run);
	const staged = calls[0].args[2];
	assert.equal(calls[1].args[calls[1].args.length - 2], staged);
});

test("a visudo that refuses the file stops before root is asked for anything", async () => {
	const calls: string[] = [];
	await assert.rejects(
		install("60", async (file: string) => {
			calls.push(file);
			if (file === "/usr/sbin/visudo") throw new Error(">>> /etc/sudoers.d/raccoon: syntax error");
		}),
		/syntax error/,
	);
	assert.deepEqual(calls, ["/usr/sbin/visudo"]);
});

test("removing touches the drop-in and nothing else", async () => {
	const { calls, run } = recorder();
	await uninstall(run);
	assert.deepEqual(calls, [{ file: "/usr/bin/sudo", args: ["/bin/rm", "-f", SUDOERS_PATH] }]);
});
