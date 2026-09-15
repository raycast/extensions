import { spawn } from "node:child_process";
import type { RccExit } from "./exit.ts";

/**
 * Run a command as its own process group, so that stopping it stops everything
 * it started.
 *
 * rcc is a shell script, and the minutes in a long run belong to something it
 * called: brew, npm, pip, ssh, `softwareupdate -l`. Signalling the process rcc
 * happens to be left all of those working while the screen already said the run
 * had stopped. `detached` makes the child a group leader; the signal goes to the
 * group.
 *
 * Kept apart from the rest of the CLI plumbing because this is the part with a
 * failure nobody sees - a process that outlives the window it was started from -
 * and a module that imports no Raycast API is a module that can be tested.
 */

/** How long a stopped run has to put itself away before it is killed outright. */
export const KILL_GRACE_MS = 3_000;

/** One piece of a command's output, tagged with the pipe it came out of. */
export type Chunk = {
	text: string;
	source: "stdout" | "stderr";
};

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
		const child = spawn(file, args, { env, detached: true, stdio: ["ignore", "pipe", "pipe"] });

		// A negative pid is the group. SIGTERM first so each child can put
		// itself away - a half-written brew install is worse than a slow one -
		// then SIGKILL for whatever ignored it.
		const killGroup = (killSignal: NodeJS.Signals) => {
			if (child.pid === undefined) return;
			try {
				process.kill(-child.pid, killSignal);
			} catch {
				// Already gone, which is the outcome asked for.
			}
		};

		let escalation: NodeJS.Timeout | undefined;
		let stopped = false;
		const abort = () => {
			stopped = true;
			killGroup("SIGTERM");
			escalation = setTimeout(() => killGroup("SIGKILL"), graceMs);
			// Waiting to kill something must not be a reason to stay alive.
			escalation.unref();
		};
		signal?.addEventListener("abort", abort, { once: true });

		const settle = () => {
			signal?.removeEventListener("abort", abort);
			// After a stop the grace window is kept. `close` says the direct
			// child has gone and its pipes are shut, which is not the same as
			// the group being empty: something further down can still be
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
