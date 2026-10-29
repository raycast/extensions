import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { parseGroups, splitGroups } from "./audit-groups.ts";
import { type AuditReport, readAuditRun } from "./audit-json.ts";
import { runRcc, RUNTIME_PATH } from "./rcc";
import { supportsAuditFlag } from "./terminal";
import { useRccExec } from "./use-rcc-exec";

/**
 * The audit, in the order its answers arrive.
 *
 * One check in the `core` group asks Apple's servers whether this Mac has
 * updates. Measured group by group on one Mac: core 615s, every other group 2s
 * between them. As a single command that made a screen which showed nothing at
 * all for ten minutes - twenty-four finished checks waiting on a network call
 * nobody can hurry - and a screen that shows nothing reads as a broken one.
 *
 * So the groups that answer at once are run first and shown, and `core` is run
 * alongside and joined to the top when it lands. An rcc that does not know
 * `--only` is run whole, as before: an unknown flag is ignored rather than
 * refused, and half an audit presented as a whole one would be worse than a
 * slow one.
 */
export function useAudit({ rcc, deep, timeout }: { rcc: string | null; deep: boolean; timeout: number }) {
	const plan = usePromise(
		async (binary: string) => {
			if (!(await supportsAuditFlag(binary, "--only"))) return undefined;
			return splitGroups(parseGroups(await runRcc(["audit", "--list-checks"])));
		},
		[rcc ?? ""],
		{
			execute: rcc !== null,
			// A probe that fails already has its answer: run the audit whole.
			// Without this, usePromise raises its own "Failed to fetch latest
			// data" toast over a screen that is working correctly - a warning
			// about nothing, in front of an audit that is running.
			onError: () => {},
		},
	);

	const split = plan.data;
	const ready = rcc !== null && !plan.isLoading;
	const base = deep ? ["audit", "--deep"] : ["audit"];

	const quick = useRccExec(
		rcc ?? "rcc",
		split ? [...base, "--only", split.fast.join(","), "--json"] : [...base, "--json"],
		{
			execute: ready,
			timeout,
			path: RUNTIME_PATH,
			// The exit code is classified here, not by the hook: audit spends 1 on
			// "a check failed" and 2 on "warnings only", and both are reports.
			parseOutput: readAuditRun,
		},
	);

	const slow = useRccExec(rcc ?? "rcc", [...base, "--only", split?.slow ?? "core", "--json"], {
		execute: ready && split !== undefined,
		// Its own ceiling, four times the other: this is the group that waits
		// on Apple's servers, and 615s was measured on one Mac in one
		// afternoon. The whole-run timeout would cut it off at five minutes
		// and lose the six checks a reader opens this screen for.
		timeout: timeout * 4,
		path: RUNTIME_PATH,
		parseOutput: readAuditRun,
	});

	// The slow group goes first, where it was before the audit was split: those
	// are the checks a reader opens this screen for, and a list that reorders
	// itself under the cursor is worse than one that waits.
	const data = useMemo<AuditReport | undefined>(() => {
		if (!quick.data) return slow.data;
		if (!slow.data) return quick.data;
		const results = [...slow.data.results, ...quick.data.results];
		return {
			...quick.data,
			results,
			pass: results.filter((check) => check.status === "pass").length,
			warning: results.filter((check) => check.status === "warn").length,
			fail: results.filter((check) => check.status === "fail").length,
		};
	}, [quick.data, slow.data]);

	return {
		data,
		isLoading: plan.isLoading || quick.isLoading || (split !== undefined && slow.isLoading),
		error: quick.error,
		/**
		 * Whether every group has reported.
		 *
		 * Asked of both halves, not just the slow one: either can land first,
		 * and a count drawn from one of them is not a verdict. Six core checks
		 * with "0 fail" under them says this Mac is in order when twenty-four
		 * have not been run.
		 */
		whole: quick.data !== undefined && (split === undefined || slow.data !== undefined),
		/** The group still running, once the rest is on screen. */
		pending: split && slow.isLoading ? split.slow : undefined,
		/** A failure in the slow group alone, which must not empty the screen. */
		pendingError: split && !slow.isLoading ? slow.error : undefined,
		revalidate: () => {
			quick.revalidate();
			// Only when there is a split. usePromise's revalidate does not
			// consult `execute`, so on an rcc that ignores --only this would
			// run the whole audit a second time and the merge would list every
			// check twice.
			if (split) slow.revalidate();
		},
	};
}
