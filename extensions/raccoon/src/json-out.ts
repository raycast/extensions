/**
 * Reading `--json` from whatever rcc the reader has installed.
 *
 * Two things go wrong with an older CLI, and they are not the same:
 *
 * - Before 0.17.0, `audit` and `memory` printed their human report first and
 *   glued the JSON to the end of the same stdout. That is recoverable: the
 *   document is there, with something in front of it.
 * - Before 0.17.0, `ports --json` emitted invalid JSON, because process names
 *   carrying a backslash were not escaped. That is not recoverable, and saying
 *   "upgrade" is the only honest answer.
 *
 * The extension is installed against whatever binary is on the machine, so it
 * reads what it can and names the version when it cannot.
 */

const UPGRADE =
	"An rcc older than 0.17.0 prints its report before the JSON, and its ports " +
	"output is not valid JSON at all. Upgrade with `brew upgrade rcc`, or point " +
	"the Raccoon CLI preference at a newer binary.";

/** The first stretch of output, enough to see what went wrong, short enough to read. */
function excerpt(text: string): string {
	const head = text.slice(0, 400);
	return head.length < text.length ? `${head}\n…` : head;
}

/** Marks of rcc's human report: a step counter, a table row, a section rule. */
const REPORT_MARKS = [
	/^\s*\[\d+\/\d+\]/m, // [1/4] PATH entries...
	/^\s*\|/m, //            | Path | Status |
	/^\s*--\s/m, //          -- PATH Entries
];

/** The start of an ANSI colour sequence, as a plain string: a regex literal
 *  holding an ESC trips no-control-regex, and there is nothing to match here
 *  that needs a pattern. */
const ANSI = "\u001b[";

/**
 * Whether this looks like a CLI that answered in prose rather than JSON.
 *
 * The distinction decides what the reader is told, and the first version of it
 * got the decision backwards: it asked whether the output *started* with a
 * bracket, and rcc's own step counter reads `[1/4] PATH entries...`, which
 * starts with one. So the case this exists for — an old rcc printing its report
 * — was classed as a broken emitter.
 *
 * It now looks for what a report actually contains. Output with a step counter,
 * a table row, a section rule or a colour escape in it is prose, and "upgrade"
 * is the answer. Output with none of those is a document that stopped making
 * sense partway through, which is a bug in the emitter — and telling that reader
 * to upgrade sends them to fix something that is not broken, which is what
 * happened when `fonts --json` wrote an empty count into an otherwise
 * well-formed report and the extension blamed their version of rcc.
 */
function looksLikeProse(text: string): boolean {
	return text.includes(ANSI) || REPORT_MARKS.some((mark) => mark.test(text));
}

/**
 * The JSON document in a stdout that may begin with something else.
 *
 * Only a brace or a bracket at the start of a line is considered, so one
 * inside the report's own text cannot be mistaken for the start of it.
 */
export function extractJson(stdout: string, command: string): unknown {
	const text = stdout.trim();
	if (text === "") {
		throw new Error(`rcc ${command} printed nothing to parse.`);
	}
	try {
		return JSON.parse(text);
	} catch (first) {
		const lines = text.split("\n");
		for (let i = 0; i < lines.length; i += 1) {
			const start = lines[i];
			if (!start.startsWith("{") && !start.startsWith("[")) continue;
			try {
				return JSON.parse(lines.slice(i).join("\n"));
			} catch {
				// Not the start of the document: keep looking further down.
			}
		}
		const reason = first instanceof Error ? first.message : String(first);
		throw new Error(
			[
				`rcc ${command} did not print JSON: ${reason}`,
				"",
				looksLikeProse(text)
					? UPGRADE
					: "This is a defect in rcc, not a version you can upgrade past. " +
						"The output it printed is below — please report it.",
				"",
				excerpt(text),
			].join("\n"),
		);
	}
}

export function expectObject(
	stdout: string,
	command: string,
): Record<string, unknown> {
	const parsed = extractJson(stdout, command);
	if (
		typeof parsed !== "object" ||
		parsed === null ||
		Array.isArray(parsed)
	) {
		throw new Error(
			`rcc ${command} printed JSON, but not a report object.`,
		);
	}
	return parsed as Record<string, unknown>;
}

export function expectArray(stdout: string, command: string): unknown[] {
	const parsed = extractJson(stdout, command);
	if (!Array.isArray(parsed)) {
		throw new Error(`rcc ${command} printed JSON, but not a list.`);
	}
	return parsed;
}

/**
 * How long a `--json` command may take before Raycast kills it.
 *
 * `useExec` defaults to ten seconds, and `fonts` needed fifteen: it ran
 * `fc-scan` once per font file. Both halves are fixed — that scan is a single
 * call now — and this is the headroom for the machine slower than the one it
 * was measured on. The slowest command left takes about five seconds.
 */
export const JSON_TIMEOUT_MS = 60_000;

/** The fields of `useExec`'s result that reading it correctly depends on. */
type ExecResult = {
	stdout: string;
	stderr: string;
	error?: Error;
	exitCode: number | null;
	signal: NodeJS.Signals | null;
};

/**
 * `parseOutput` for a view that reads a `--json` report.
 *
 * A killed command still reaches `parseOutput`, with `signal` set and a stdout
 * that stops wherever the process was when it died. Parsing that fragment is
 * how a reader came to be told "this is a defect in rcc" about a report whose
 * only problem was that it ended one line before its closing brace — the
 * emitter was fine, the clock ran out. A truncated document is not a malformed
 * one and must not be read as if it were.
 *
 * A non-zero exit code on its own is not a failure: rcc reports findings that
 * way and its document is complete. Only a signal or a spawn error means the
 * output stopped early.
 */
export function readJson<T>(
	command: string,
	parse: (stdout: string) => T,
): (result: ExecResult) => T {
	return ({ stdout, signal, error }) => {
		if (signal || error) {
			const why = signal ? ` (${signal})` : "";
			throw new Error(
				[
					`rcc ${command} was cut off after ${JSON_TIMEOUT_MS / 1000}s${why} ` +
						"and its report is incomplete.",
					error?.message ?? "",
				]
					.join("\n")
					.trim(),
			);
		}
		return parse(stdout);
	};
}
