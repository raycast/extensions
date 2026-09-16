import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { promisify } from "node:util";
import { getPreferenceValues } from "@raycast/api";
import type { RccExit } from "./exit";
import { spawnTree, type Chunk as RccChunk } from "./spawn-tree.ts";

const execFileAsync = promisify(execFile);

/** Where rcc itself may be installed. Raycast does not inherit a login shell PATH. */
const RCC_SEARCH_PATHS = ["/opt/homebrew/bin", "/usr/local/bin", `${homedir()}/.local/bin`];

/**
 * PATH handed to rcc. The system directories are not optional: rcc's checks call
 * system_profiler, diskutil, lsof, networksetup and ifconfig, which live in
 * /usr/sbin and /sbin. Without them rcc silently reports zeroes.
 */
export const RUNTIME_PATH = [...RCC_SEARCH_PATHS, "/usr/bin", "/bin", "/usr/sbin", "/sbin"].join(":");

export const INSTALL_COMMAND = "brew install thousandflowers/tap/rcc";

/**
 * Point past which a scripted run is assumed hung rather than slow.
 *
 * The same reasoning as the audit screen's: `rcc audit --export` shells out to
 * `softwareupdate -l`, whose pace belongs to Apple's servers rather than to
 * rcc. Far enough out that a slow one never reaches it.
 */
const RUN_TIMEOUT_MS = 5 * 60 * 1000;

export class RccNotFoundError extends Error {
	constructor() {
		super("rcc not found");
		this.name = "RccNotFoundError";
	}
}

function isExecutable(path: string): boolean {
	try {
		accessSync(path, constants.X_OK);
		return true;
	} catch {
		return false;
	}
}

/** Resolve the rcc binary: user preference first, then the usual install dirs. */
export function resolveRcc(): string {
	const { rccPath } = getPreferenceValues<Preferences>();
	const candidates = [rccPath, ...RCC_SEARCH_PATHS.map((dir) => `${dir}/rcc`)];
	for (const candidate of candidates) {
		if (candidate && isExecutable(candidate)) return candidate;
	}
	throw new RccNotFoundError();
}

/** One piece of a command's output, tagged with the pipe it came out of. */
export type { RccChunk };

/**
 * Stream a command's output, calling `onData` as it arrives with the pipe each
 * chunk came from.
 *
 * Streaming rather than buffering is what lets the privileged commands run
 * inside Raycast: `rcc upgrade` and `rcc audit --deep` take minutes and print
 * progress the whole way, and rcc raises its own Touch ID dialog for sudo
 * (pam_tid needs no controlling terminal), so nothing has to leave Raycast.
 *
 * The two pipes are reported separately but not reordered: rcc interleaves
 * progress on stderr with the report on stdout, and a view that split them
 * would show the report out of order.
 *
 * Resolves with how the command ended. A non-zero code is not an error by
 * itself — see `isFailure`.
 */
function stream(
	file: string,
	args: string[],
	onData: (chunk: RccChunk) => void,
	signal?: AbortSignal,
	path: string = RUNTIME_PATH,
): Promise<RccExit> {
	return spawnTree(file, args, {
		// RCC_PROGRESS_PROTOCOL asks rcc for the __RCC_PROGRESS__ lines
		// upgrade-progress.ts parses. Without it rcc stays quiet: it used to
		// emit them whenever stdout was not a terminal, which put the protocol
		// into every redirect and log a person ever made.
		env: {
			...process.env,
			NO_COLOR: "1",
			RCC_PROGRESS_PROTOCOL: "1",
			PATH: path,
		},
		onData,
		signal,
	});
}

/**
 * Commands whose subject is the reader's own PATH.
 *
 * Under RUNTIME_PATH they would audit this extension's seven directories
 * instead of the forty the reader's shell has — which is what the Environment
 * screen did: nothing missing, nothing duplicated, on a machine with fourteen
 * and eight.
 */
const PATH_COMMANDS = new Set(["env", "overlap"]);

const PATH_MARKER = "__RCC_PATH__";
let loginPath: Promise<string> | undefined;

/**
 * The PATH the reader's own terminal has: what their login shell builds from
 * its startup files. Read once per process, since it costs a shell start.
 */
export function loginShellPath(): Promise<string> {
	loginPath ??= (async () => {
		const shell = process.env.SHELL || "/bin/zsh";
		let out = "";
		// Login and interactive, because PATH edits live in .zprofile and
		// .zshrc alike. The marker keeps a chatty startup file's output out of
		// the answer; stdin is closed so a prompt in one cannot wait forever.
		await stream(
			shell,
			["-lic", `printf "\\n${PATH_MARKER}%s\\n" "$PATH"`],
			(chunk) => {
				if (chunk.source === "stdout") out += chunk.text;
			},
			AbortSignal.timeout(20_000),
		);
		const line = out
			.split("\n")
			.reverse()
			.find((l) => l.startsWith(PATH_MARKER));
		if (!line) throw new Error(`${shell} did not report its PATH.`);
		return line.slice(PATH_MARKER.length);
	})();
	return loginPath;
}

/** The PATH `rcc <command>` should run under. */
export function pathFor(command: string): Promise<string> {
	return PATH_COMMANDS.has(command) ? loginShellPath() : Promise.resolve(RUNTIME_PATH);
}

/** Stream `rcc <args>`. */
export async function streamRcc(
	args: string[],
	onData: (chunk: RccChunk) => void,
	signal?: AbortSignal,
): Promise<RccExit> {
	return stream(resolveRcc(), args, onData, signal, await pathFor(args[0]));
}

/** Stream the Homebrew install of rcc, for the first-run setup screen. */
export async function streamInstall(onData: (chunk: RccChunk) => void, signal?: AbortSignal): Promise<RccExit> {
	return stream("/bin/sh", ["-lc", INSTALL_COMMAND], onData, signal);
}

/** Everything a finished run produced, in the shape the parsers already read. */
export type RccOutput = {
	stdout: string;
	stderr: string;
	exitCode: number | null;
	signal: NodeJS.Signals | null;
	timedOut?: boolean;
};

/**
 * Run a command to the end and hand back both pipes.
 *
 * What `useExec` does, except that the run is stoppable: it goes through
 * `stream`, so it has its own process group and closing the screen takes the
 * whole tree with it rather than the one process rcc happens to be.
 */
export async function collect(
	file: string,
	args: string[],
	{ path, timeoutMs, signal }: { path: string; timeoutMs: number; signal?: AbortSignal },
): Promise<RccOutput> {
	let stdout = "";
	let stderr = "";
	// The deadline is kept separately from the caller's signal so the result can
	// say which of the two ended the run; a timeout and a closed screen are not
	// the same news.
	const deadline = AbortSignal.timeout(timeoutMs);
	const either = signal ? AbortSignal.any([signal, deadline]) : deadline;
	const exit = await stream(
		file,
		args,
		(chunk) => {
			if (chunk.source === "stdout") stdout += chunk.text;
			else stderr += chunk.text;
		},
		either,
		path,
	);
	return {
		stdout,
		stderr,
		exitCode: exit.code,
		signal: exit.signal,
		timedOut: deadline.aborted,
	};
}

/** Run `rcc <args>` and return its stdout in one go (for short, scripted uses). */
export async function runRcc(args: string[]): Promise<string> {
	const { stdout } = await execFileAsync(resolveRcc(), args, {
		env: { ...process.env, NO_COLOR: "1", PATH: await pathFor(args[0]) },
		maxBuffer: 10 * 1024 * 1024,
		timeout: RUN_TIMEOUT_MS,
	});
	return stdout;
}
