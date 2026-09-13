import { useCallback, useEffect, useRef, useState } from "react";
import type { RccExit } from "./exit";
import { streamRcc } from "./rcc";

/**
 * Run `rcc <args>` and expose its output as it arrives.
 *
 * Long commands (`upgrade`, `audit --deep`) print progress for minutes, so the
 * view fills in live instead of sitting empty behind a spinner.
 *
 * `output` is both pipes in arrival order, which is what the report has to be
 * read as. The two are also kept apart: `stderrOutput` lets a failure say what
 * went wrong without making the reader hunt through the whole run, and
 * `stdoutOutput` answers whether a report was produced at all, which is how an
 * audit's findings are told apart from an audit that never ran. `exit` stays
 * undefined until the command ends.
 */
export function useRccStream(args: string[]) {
	const [output, setOutput] = useState("");
	const [stdoutOutput, setStdoutOutput] = useState("");
	const [stderrOutput, setStderrOutput] = useState("");
	const [exit, setExit] = useState<RccExit | undefined>();
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | undefined>();
	const [runCount, setRunCount] = useState(0);
	const controllerRef = useRef<AbortController>(undefined);

	const key = args.join(" ");

	useEffect(() => {
		const controller = new AbortController();
		controllerRef.current = controller;
		setOutput("");
		setStdoutOutput("");
		setStderrOutput("");
		setExit(undefined);
		setError(undefined);
		setIsLoading(true);

		streamRcc(
			key.split(" "),
			(chunk) => {
				const append = (previous: string) => previous + chunk.text;
				setOutput(append);
				if (chunk.source === "stderr") setStderrOutput(append);
				else setStdoutOutput(append);
			},
			controller.signal,
		)
			.then(setExit)
			.catch((caught: Error) => setError(caught))
			.finally(() => setIsLoading(false));

		return () => controller.abort();
	}, [key, runCount]);

	const reload = useCallback(() => setRunCount((n) => n + 1), []);
	const stop = useCallback(() => controllerRef.current?.abort(), []);

	return {
		output,
		stdoutOutput,
		stderrOutput,
		exit,
		isLoading,
		error,
		reload,
		stop,
	};
}
