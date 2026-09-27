import { usePromise } from "@raycast/utils";
import { useRef } from "react";
import { collect, type RccOutput } from "./rcc";

/**
 * `useExec`, for a command that has to stop when the screen does.
 *
 * @raycast/utils signals the process it started and nothing underneath it, and
 * rcc is a shell script: the slow part of an audit is `softwareupdate -l`, one
 * level down. Leaving the screen ended rcc and left that running, with nobody
 * left to read what it said. This runs the same command through the
 * extension's own spawn, which gives it a process group and takes the group
 * down together.
 *
 * The return shape is `useExec`'s, so a view swaps one call and keeps the rest.
 */
export function useRccExec<T>(
	file: string,
	args: string[],
	options: {
		/** False while the binary or its PATH is still unknown. */
		execute: boolean;
		/** PATH the command runs under. */
		path: string;
		/** Point past which the command is assumed hung rather than slow. */
		timeout: number;
		parseOutput: (output: RccOutput) => T;
	},
) {
	const abortable = useRef<AbortController>(null);

	// The dependency is the joined form, never the array. `args` is built fresh
	// on every render, so passing it here restarted the command on every
	// render: three audits were measured running at once, each one killing the
	// last, and the screen stayed on its spinner for good. The run itself is
	// given the real argv out of a ref, because splitting the key back apart
	// would cut any argument containing a space.
	const argv = useRef(args);
	argv.current = args;
	const key = args.join("\u0000");

	return usePromise(
		async (_key: string, binary: string, path: string) =>
			options.parseOutput(
				await collect(binary, argv.current, {
					path,
					timeoutMs: options.timeout,
					signal: abortable.current?.signal,
				}),
			),
		[key, file, options.path],
		{ execute: options.execute, abortable },
	);
}
