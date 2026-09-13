// Zero-dependency check: node --test src/audit-conf.test.ts
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, chmod, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { isListed, readSkipList, skipCheck } from "./audit-conf.ts";

async function scratch(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "rcc-audit-conf-"));
	return join(dir, "audit.conf");
}

test("a name is listed only on a whole line of its own", () => {
	// audit.sh matches with grep -Fxq: the whole line, literally.
	assert.equal(isListed("Firewall\n", "Firewall"), true);
	assert.equal(isListed("# Firewall\n", "Firewall"), false);
	assert.equal(isListed(" Firewall\n", "Firewall"), false);
	assert.equal(isListed("Firewall Rules\n", "Firewall"), false);
	assert.equal(isListed("\n\n", "Firewall"), false);
});

test("a missing file is created, and says what it is", async () => {
	const path = await scratch();
	assert.equal(await skipCheck("Firewall", path), "added");
	const written = await readFile(path, "utf8");
	assert.match(written, /^# Checks rcc audit will never offer to fix/);
	assert.equal(isListed(written, "Firewall"), true);
});

test("a missing directory is created too", async () => {
	const dir = await mkdtemp(join(tmpdir(), "rcc-audit-conf-"));
	const path = join(dir, "nested", "deeper", "audit.conf");
	assert.equal(await skipCheck("Firewall", path), "added");
	assert.equal(isListed(await readFile(path, "utf8"), "Firewall"), true);
});

test("an existing file keeps its comments and its order", async () => {
	const path = await scratch();
	const before = "# mine, do not touch\nStealth Mode\n\n# another note\n";
	await writeFile(path, before);
	assert.equal(await skipCheck("Firewall", path), "added");
	const after = await readFile(path, "utf8");
	assert.ok(
		after.startsWith(before),
		"the file was rewritten, not appended to",
	);
	assert.equal(after, before + "Firewall\n");
});

test("a name already there is not written twice", async () => {
	const path = await scratch();
	await writeFile(path, "Firewall\n");
	assert.equal(await skipCheck("Firewall", path), "already-listed");
	assert.equal(await readFile(path, "utf8"), "Firewall\n");
});

test("a file with no trailing newline does not glue the name to the last line", async () => {
	const path = await scratch();
	await writeFile(path, "Stealth Mode");
	await skipCheck("Firewall", path);
	const after = await readFile(path, "utf8");
	assert.equal(after, "Stealth Mode\nFirewall\n");
	assert.equal(isListed(after, "Stealth Mode"), true);
	assert.equal(isListed(after, "Firewall"), true);
});

test("a file that cannot be written throws the reason", async () => {
	const dir = await mkdtemp(join(tmpdir(), "rcc-audit-conf-"));
	const path = join(dir, "audit.conf");
	await writeFile(path, "Stealth Mode\n");
	await chmod(path, 0o444);
	await assert.rejects(() => skipCheck("Firewall", path), /EACCES|EPERM/);
	// and it changed nothing
	assert.equal(await readFile(path, "utf8"), "Stealth Mode\n");
});

test("a directory that cannot be created throws the reason", async () => {
	const dir = await mkdtemp(join(tmpdir(), "rcc-audit-conf-"));
	const locked = join(dir, "locked");
	await mkdir(locked);
	await chmod(locked, 0o555);
	await assert.rejects(
		() => skipCheck("Firewall", join(locked, "sub", "audit.conf")),
		/EACCES|EPERM/,
	);
});

test("something that is not a check name is refused", async () => {
	const path = await scratch();
	await assert.rejects(() => skipCheck("", path), /Not a check name/);
	await assert.rejects(() => skipCheck("a\nb", path), /Not a check name/);
});

// --- reading the list back --------------------------------------------------
//
// The JSON cannot say which checks are skipped: fix_available is recorded before
// the opt-out is consulted, deliberately, so that a consumer can see the skipped
// ones at all. Which means the consumer has to read the file, from where the
// file is written.

test("a file that is not there is an empty list, not an error", async () => {
	const path = await scratch();
	assert.deepEqual(await readSkipList(path), []);
});

test("comments and blank lines are not check names", async () => {
	const path = await scratch();
	await writeFile(
		path,
		"# a note\n\nFirewall\n   \n# another\nStealth Mode\n",
	);
	assert.deepEqual(await readSkipList(path), ["Firewall", "Stealth Mode"]);
});

test("what is read back is what isListed matches", async () => {
	const path = await scratch();
	await skipCheck("Firewall", path);
	await skipCheck("Stealth Mode", path);
	const listed = await readSkipList(path);
	assert.deepEqual(listed, ["Firewall", "Stealth Mode"]);
	const contents = await readFile(path, "utf8");
	for (const name of listed) assert.equal(isListed(contents, name), true);
});

test("a name with leading space is read verbatim, and matches nothing", async () => {
	// grep -Fxq compares whole lines: " Firewall" is not "Firewall", and the
	// reader must not quietly trim it into one.
	const path = await scratch();
	await writeFile(path, " Firewall\n");
	assert.deepEqual(await readSkipList(path), [" Firewall"]);
	assert.equal(isListed(await readFile(path, "utf8"), "Firewall"), false);
});
