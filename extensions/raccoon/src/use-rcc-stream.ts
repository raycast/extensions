import { useCallback, useEffect, useRef, useState } from "react";
import type { RccExit } from "./exit";
import { idleTimer, IDLE_TIMEOUT_MS } from "./idle-timer.ts";
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
	const [gaveUp, setGaveUp] = useState(false);
	const controllerRef = useRef<AbortController>(undefined);

	// The joined form is the dependency - a new array every render must not
	// restart the run - but the run itself is given the real argv: splitting
	// the key back apart would cut any argument that contains a space.
	const key = args.join(" ");
	const argv = useRef(args);
	argv.current = args;

	useEffect(() => {
		const controller = new AbortController();
		controllerRef.current = controller;
		setOutput("");
		setStdoutOutput("");
		setStderrOutput("");
		setExit(undefined);
		setError(undefined);
		setIsLoading(true);
		setGaveUp(false);

		// Born inside this effect, like the controller, and for the same
		// reason: a superseded run keeps draining its pipe, and a timer shared
		// across runs would let those late chunks keep the NEXT run's wait
		// alive - hiding exactly the hang this is here to catch.
		const idle = idleTimer(IDLE_TIMEOUT_MS, () => {
			if (controllerRef.current !== controller) return;
			setGaveUp(true);
			// The same abort the Stop action uses: one way out of a run, not two.
			controller.abort();
		});

		streamRcc(
			argv.current,
			(chunk) => {
				// Only the run that is still the current one may write. A
				// stopped run keeps delivering what it had already buffered,
				// and those late chunks used to land on the state the next run
				// had just cleared: the same block appeared twice in one log.
				if (controllerRef.current !== controller) return;
				idle.poke();
				const append = (previous: string) => previous + chunk.text;
				setOutput(append);
				if (chunk.source === "stderr") setStderrOutput(append);
				else setStdoutOutput(append);
			},
			controller.signal,
		)
			// The same rule as the chunks above, and for the same reason: a run
			// that has been superseded finishes in its own time, and its ending
			// must not become the new run's. Left unguarded it could report the
			// old exit status, or clear the spinner while the new command was
			// still going.
			.then((finished) => {
				if (controllerRef.current === controller) setExit(finished);
			})
			.catch((caught: Error) => {
				if (controllerRef.current === controller) setError(caught);
			})
			.finally(() => {
				idle.stop();
				if (controllerRef.current === controller) setIsLoading(false);
			});

		return () => {
			idle.stop();
			controller.abort();
		};
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
		/** Whether this run was given up on for silence rather than stopped by hand. */
		gaveUp,
		reload,
		stop,
	};
}
