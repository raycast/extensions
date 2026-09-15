import { runRcc } from "./rcc";
import { meetsMinimum, parseRccVersion, type RccVersion } from "./rcc-version.ts";

/** The release that added `rcc audit --export`. */
export const MIN_EXPORT_VERSION: RccVersion = [1, 0, 1];

export const EXPORT_NEEDS_UPGRADE = "Exporting the report needs rcc 1.0.1 or newer. Upgrade with `brew upgrade rcc`.";

/**
 * The formats `rcc audit --export` accepts, in the order a technician reaches
 * for them: the document you hand over, the one that opens in Word, the page,
 * the spreadsheet, the machine's copy.
 */
export const AUDIT_EXPORT_FORMATS = [
	{ id: "md", title: "Markdown", subtitle: "Client-ready document" },
	{ id: "rtf", title: "RTF", subtitle: "Opens in TextEdit or Word" },
	{ id: "html", title: "HTML", subtitle: "Report as a web page" },
	{
		id: "csv",
		title: "CSV",
		subtitle: "One row per check, for a spreadsheet",
	},
	{ id: "json", title: "JSON", subtitle: "Machine-readable" },
] as const;

export type AuditExportFormat = (typeof AUDIT_EXPORT_FORMATS)[number]["id"];

/**
 * Run the audit and save it as a document, returning the path rcc chose.
 *
 * `--export` picks the filename so this side does not have to invent one, and
 * prints where it went; the path is read back from that line rather than
 * rebuilt here, so the two cannot drift apart.
 */
export async function exportAudit(format: AuditExportFormat): Promise<string> {
	await requireExportSupport();

	let stdout: string;
	try {
		stdout = await runRcc(["audit", "--export", format]);
	} catch (error) {
		// `rcc audit` exits 1 when a check failed and 2 when it only warned.
		// Both are ordinary results — on most machines 2 is the answer — and
		// execFile rejects on any non-zero code, so treating a rejection as a
		// failure here would have made the export unusable on a healthy Mac.
		// Anything outside the documented codes is a real error and rethrown.
		const failure = error as { code?: number; stdout?: string };
		if (failure.code !== 1 && failure.code !== 2) {
			throw error;
		}
		stdout = failure.stdout ?? "";
	}

	const saved = stdout.match(/Report saved to:\s*(.+)/);
	if (!saved) {
		throw new Error("rcc ran but did not say where it saved the report");
	}
	return saved[1].trim();
}

/**
 * Refuse the export on an rcc that predates it, and say what to do about it.
 *
 * Older versions do not reject `--export`; they run an ordinary audit and print
 * no path, so without this the action failed with "rcc ran but did not say
 * where it saved the report" - true, and no help at all.
 *
 * A version that cannot be read is allowed through: the banner is not a
 * contract, and refusing a working install on the strength of it would be the
 * worse failure of the two.
 */
async function requireExportSupport(): Promise<void> {
	let banner: string;
	try {
		banner = await runRcc(["--version"]);
	} catch {
		// An rcc that cannot say what it is still gets to try; whatever is
		// really wrong will say so in its own words.
		return;
	}
	if (!meetsMinimum(banner, MIN_EXPORT_VERSION)) {
		throw new Error(`This rcc is ${parseRccVersion(banner)?.join(".")}. ${EXPORT_NEEDS_UPGRADE}`);
	}
}
