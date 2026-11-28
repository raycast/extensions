import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { spawnTree } from "./spawn-tree.ts";

const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));

function alive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

/**
 * The pid of the process the shell started - rcc's `brew`, `ssh` or
 * `softwareupdate`.
 *
 * Read from a file the shell writes rather than looked up by name: the shell's
 * own command line contains the whole command it was given, so searching for
 * the grandchild by any marker finds the shell first and the test ends up
 * proving something about the wrong process.
 */
async function startedPid(file: string): Promise<number> {
	for (let attempt = 0; attempt < 60; attempt++) {
		try {
			const pid = Number(readFileSync(file, "utf8").trim());
			if (pid) return pid;
		} catch {
			// Not written yet.
		}
		await wait(50);
	}
	throw new Error("the shell never reported what it started");
}

async function goneWithin(pid: number, ms: number): Promise<boolean> {
	const deadline = Date.now() + ms;
	while (Date.now() < deadline) {
		if (!alive(pid)) return true;
		await wait(50);
	}
	return false;
}

function pidFile(name: string): string {
	return join(tmpdir(), `raccoon-${name}-${process.pid}-${Date.now()}`);
}

test("stopping a run kills what it started, and does not wait for it to finish", async () => {
	const file = pidFile("tree");
	const stop = new AbortController();
	const finished = spawnTree("/bin/sh", ["-c", `sleep 60 & echo $! > ${file}; wait`], {
		env: { ...process.env },
		onData: () => {},
		signal: stop.signal,
	});
	try {
		const grandchild = await startedPid(file);
		stop.abort();

		// Both halves matter. What the run started has to die - it used to
		// outlive the window it was started from - and the promise has to
		// settle now rather than in a minute, because the screen says the run
		// has stopped the moment it does.
		assert.equal(await goneWithin(grandchild, 2_000), true, "what the run started outlived the stop");
		const settled = await Promise.race([finished.then(() => "settled"), wait(2_000).then(() => "still running")]);
		assert.equal(settled, "settled");
	} finally {
		rmSync(file, { force: true });
	}
});

test("a process that ignores the stop is killed once the grace window runs out", async () => {
	const file = pidFile("stubborn");
	const stop = new AbortController();
	// Ignores SIGTERM and lets go of the pipes; the shell quits the moment it
	// is asked to. `close` then arrives while this is still running, which is
	// where cancelling the grace window used to leave it alive for good.
	const stubborn = `/usr/bin/perl -e '$SIG{TERM}="IGNORE"; close STDOUT; close STDERR; sleep 60'`;
	const finished = spawnTree("/bin/sh", ["-c", `trap 'exit 0' TERM; ${stubborn} & echo $! > ${file}; wait`], {
		env: { ...process.env },
		onData: () => {},
		signal: stop.signal,
		graceMs: 300,
	});
	try {
		const survivor = await startedPid(file);
		// perl has to reach its first statement before the signal arrives, or
		// the default handler takes it and the test proves nothing.
		await wait(400);
		stop.abort();

		// Still there just after the stop, or the rest of this is measuring a
		// process that simply obeyed.
		await wait(100);
		assert.equal(alive(survivor), true, "this process was supposed to ignore SIGTERM");
		assert.equal(await goneWithin(survivor, 3_000), true, "a process that ignores SIGTERM was never killed");
		await finished;
	} finally {
		rmSync(file, { force: true });
	}
});

test("a run that ends on its own reports its status, not a signal", async () => {
	const exit = await spawnTree("/bin/sh", ["-c", "exit 3"], { env: { ...process.env }, onData: () => {} });
	assert.deepEqual(exit, { code: 3, signal: null });
});

test("both pipes are reported, each tagged with where it came from", async () => {
	const seen: string[] = [];
	await spawnTree("/bin/sh", ["-c", "echo out; echo err >&2"], {
		env: { ...process.env },
		onData: (chunk) => seen.push(`${chunk.source}:${chunk.text.trim()}`),
	});
	assert.ok(seen.includes("stdout:out"), seen.join(","));
	assert.ok(seen.includes("stderr:err"), seen.join(","));
});
