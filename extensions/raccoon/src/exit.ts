/**
 * How a command ended. `signal` is set when it was killed rather than exited.
 */
export type RccExit = {
	code: number;
	signal: NodeJS.Signals | null;
};

/**
 * Whether an exit status means the command failed, rather than reported.
 *
 * `rcc audit` carries its findings in its status: 0 everything passed, 1 at
 * least one check failed, 2 warnings only (bin/audit.sh, `_audit_exit_code`).
 * A report that found something is not a run that broke, so those two are not
 * failures. Any other non-zero status, from audit or anything else, is.
 *
 * `printedReport` is what separates "2, warnings only" from the other 2 audit
 * can exit with: an unknown `--only` group is a usage error that also exits 2,
 * having written nothing to stdout. Checked rather than assumed, because a
 * status carrying two meanings cannot be read from the number alone.
 *
 * A command the user stopped exits on a signal; that is not a failure either.
 */
export function isFailure(
	args: string[],
	exit: RccExit,
	printedReport: boolean,
): boolean {
	if (exit.signal !== null) return false;
	if (exit.code === 0) return false;
	if (
		args[0] === "audit" &&
		printedReport &&
		(exit.code === 1 || exit.code === 2)
	)
		return false;
	return true;
}
