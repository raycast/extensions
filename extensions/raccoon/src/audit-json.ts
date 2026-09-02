import { extractJson } from "./json-out.ts";
// The .ts extension is what node's ESM resolver needs to load this module from
// audit-json.test.ts, and tsc accepts it here because allowImportingTsExtensions
// is on. Without it the test cannot import this file at all.
import { isFailure, type RccExit } from "./exit.ts";

export type AuditStatus = "pass" | "warn" | "fail";

/** One check, as `rcc audit --json` reports it. Every field is a string but one. */
export type AuditCheck = {
	status: AuditStatus;
	category: string;
	name: string;
	value: string;
	cis: string;
	command: string;
	/**
	 * Whether a fix is available for this check right now. It is not a property
	 * of the check: audit only offers a fix when, as things stand in this run,
	 * there is something to change, so a Mac with nothing wrong reports false
	 * everywhere. Zero fixable is the ordinary case, not an empty result.
	 */
	fix_available?: boolean;
};

export type AuditReport = {
	timestamp: string;
	audit_type: string;
	pass: number;
	warning: number;
	fail: number;
	results: AuditCheck[];
};

/** What `useExec`'s parseOutput is handed. Narrowed to what this needs. */
export type ExecOutcome = {
	stdout: string;
	stderr: string;
	exitCode: number | null;
	signal: NodeJS.Signals | null;
	timedOut?: boolean;
};

const STATUSES: AuditStatus[] = ["pass", "warn", "fail"];

function isCheck(value: unknown): value is AuditCheck {
	if (typeof value !== "object" || value === null) return false;
	const c = value as Record<string, unknown>;
	return (
		typeof c.status === "string" &&
		STATUSES.includes(c.status as AuditStatus) &&
		typeof c.category === "string" &&
		typeof c.name === "string" &&
		typeof c.value === "string" &&
		typeof c.cis === "string" &&
		typeof c.command === "string" &&
		// Optional on purpose: fix_available arrived in rcc 0.17.0, and an
		// extension that refuses an older report shows a red screen instead of
		// thirty checks it could perfectly well render. Absent means unknown,
		// which fixableCount already treats as not fixable.
		(c.fix_available === undefined || typeof c.fix_available === "boolean")
	);
}

/**
 * Read the report out of stdout, or say why it could not be read.
 *
 * The shape is checked rather than cast: `rcc audit --json` used to print the
 * boxed report and then glue the JSON to the end of the same stdout, and a cast
 * would have turned that into undefined fields at render time instead of one
 * sentence here.
 */
export function parseAuditReport(stdout: string): AuditReport {
	const text = stdout.trim();
	if (text === "") throw new Error("rcc audit printed nothing to parse.");

	const parsed = extractJson(stdout, "audit");

	if (
		typeof parsed !== "object" ||
		parsed === null ||
		Array.isArray(parsed)
	) {
		throw new Error("rcc audit printed JSON, but not a report object.");
	}
	const report = parsed as Record<string, unknown>;
	if (!Array.isArray(report.results)) {
		throw new Error("The report has no results array.");
	}
	const bad = report.results.findIndex((r) => !isCheck(r));
	if (bad !== -1) {
		throw new Error(
			`Result ${bad + 1} of ${report.results.length} is not shaped like a check.`,
		);
	}
	return parsed as AuditReport;
}

/**
 * Turn one run of `rcc audit --json` into a report, or into the reason there
 * isn't one.
 *
 * The exit status is classified by isFailure, not by useExec: audit spends 1 on
 * "a check failed" and 2 on "warnings only", and both of those are reports. The
 * third argument is what tells that 2 from the other 2 audit can exit with — an
 * unknown --only group, a usage error that prints nothing — so it is computed
 * from the stdout actually received, never assumed.
 */
export function readAuditRun(outcome: ExecOutcome): AuditReport {
	if (outcome.timedOut) {
		throw new Error("rcc audit ran out of time before it finished.");
	}
	const exit: RccExit = {
		code: outcome.exitCode ?? 0,
		signal: outcome.signal,
	};
	if (isFailure(["audit"], exit, outcome.stdout.trim() !== "")) {
		const reason = outcome.stderr.trim();
		throw new Error(
			`rcc audit exited with status ${exit.code}.${reason ? `\n${reason}` : ""}`,
		);
	}
	return parseAuditReport(outcome.stdout);
}

/** The counts a screen shows above the list. Derived, never trusted from the JSON. */
export function countByStatus(
	report: AuditReport,
): Record<AuditStatus, number> {
	const counts: Record<AuditStatus, number> = { pass: 0, warn: 0, fail: 0 };
	for (const check of report.results) counts[check.status] += 1;
	return counts;
}

/**
 * How many checks `rcc audit --fix` would actually change. Zero is the ordinary
 * case, and so is a fix that exists but will never be applied: a check listed in
 * audit.conf is skipped before anything is queued, so counting it would promise
 * a fix that is not coming. The list is passed in because the JSON does not
 * carry it — fix_available is recorded before the opt-out is consulted, which is
 * what lets a consumer see the skipped ones at all.
 */
export function fixableCount(
	report: AuditReport,
	skipped: ReadonlySet<string> = new Set(),
): number {
	return report.results.filter(
		(check) => check.fix_available && !skipped.has(check.name),
	).length;
}
