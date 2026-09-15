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
	return usePromise(
		async (argv: string[], path: string) =>
			options.parseOutput(
				await collect(file, argv, {
					path,
					timeoutMs: options.timeout,
					signal: abortable.current?.signal,
				}),
			),
		[args, options.path],
		{ execute: options.execute, abortable },
	);
}
