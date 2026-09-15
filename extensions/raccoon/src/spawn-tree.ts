import { execFileSync, spawn } from "node:child_process";
import type { RccExit } from "./exit.ts";

/**
 * Run a command so that stopping it stops everything it started.
 *
 * rcc is a shell script, and the minutes in a long run belong to something it
 * called: brew, npm, pip, ssh, `softwareupdate -l`. Signalling the process rcc
 * happens to be left all of those working while the screen already said the run
 * had stopped.
 *
 * The obvious way to do this is `detached`, which makes the child a process
 * group leader so one signal reaches the group. It cannot be used here: on
 * POSIX Node's `detached` also calls setsid, and in a new session rcc's
 * privileged checks never get their authentication - `rcc audit --json`
 * measured 53s and 5.9KB of report without it, and 90s and not one byte with
 * it. So the tree is walked instead, which changes nothing about how the
 * command runs.
 *
 * Kept apart from the rest of the CLI plumbing because this is the part with a
 * failure nobody sees - a process that outlives the window it was started from -
 * and a module that imports no Raycast API is a module that can be tested.
 */

/** How long a stopped run has to put itself away before it is killed outright. */
export const KILL_GRACE_MS = 3_000;

/** Deep enough for rcc -> a package manager -> what it shells out to. */
const MAX_DEPTH = 8;

/** One piece of a command's output, tagged with the pipe it came out of. */
export type Chunk = {
	text: string;
	source: "stdout" | "stderr";
};

/**
 * Every process under this one, deepest last.
 *
 * Read once, when the stop is asked for: a moment later the children have been
 * re-parented away from the process that started them and there is nothing left
 * to walk, which is exactly when the second signal needs the list.
 */
function descendants(pid: number, depth = 0): number[] {
	if (depth >= MAX_DEPTH) return [];
	let children: number[] = [];
	try {
		children = execFileSync("/usr/bin/pgrep", ["-P", String(pid)], { encoding: "utf8" })
			.split("\n")
			.map(Number)
			.filter((child) => Number.isInteger(child) && child > 1);
	} catch {
		// pgrep exits 1 when a process has no children, which is not an error.
		return [];
	}
	return [...children, ...children.flatMap((child) => descendants(child, depth + 1))];
}

export function spawnTree(
	file: string,
	args: string[],
	{
		env,
		onData,
		signal,
		graceMs = KILL_GRACE_MS,
	}: {
		env: NodeJS.ProcessEnv;
		onData: (chunk: Chunk) => void;
		signal?: AbortSignal;
		/** Overridden only by the tests, which cannot wait three seconds. */
		graceMs?: number;
	},
): Promise<RccExit> {
	return new Promise((resolve, reject) => {
		const child = spawn(file, args, { env, stdio: ["ignore", "pipe", "pipe"] });

		const signalAll = (pids: number[], killSignal: NodeJS.Signals) => {
			for (const pid of pids) {
				try {
					process.kill(pid, killSignal);
				} catch {
					// Already gone, which is the outcome asked for.
				}
			}
		};

		let escalation: NodeJS.Timeout | undefined;
		let stopped = false;
		const abort = () => {
			stopped = true;
			if (child.pid === undefined) return;
			// Deepest first, so nothing is orphaned into a shell that has
			// already been asked to quit. SIGTERM so each one can put itself
			// away: a half-written brew install is worse than a slow one.
			const tree = [...descendants(child.pid).reverse(), child.pid];
			signalAll(tree, "SIGTERM");
			escalation = setTimeout(() => signalAll(tree, "SIGKILL"), graceMs);
			// Waiting to kill something must not be a reason to stay alive.
			escalation.unref();
		};
		signal?.addEventListener("abort", abort, { once: true });

		const settle = () => {
			signal?.removeEventListener("abort", abort);
			// After a stop the grace window is kept. `close` says the direct
			// child has gone and its pipes are shut, which is not the same as
			// the tree being empty: something further down can still be
			// ignoring the SIGTERM, and clearing the timer here is how it used
			// to survive. Only an ordinary finish has nothing left to kill.
			if (!stopped) clearTimeout(escalation);
		};

		child.stdout.on("data", (chunk: Buffer) => onData({ text: chunk.toString(), source: "stdout" }));
		child.stderr.on("data", (chunk: Buffer) => onData({ text: chunk.toString(), source: "stderr" }));
		child.on("error", (error) => {
			settle();
			reject(error);
		});
		child.on("close", (code, killedBy) => {
			settle();
			resolve({ code: code ?? 0, signal: killedBy });
		});
	});
}
