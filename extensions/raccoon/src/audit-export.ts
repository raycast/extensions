import { runRcc } from "./rcc";

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
