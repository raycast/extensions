import { Clipboard, environment, open, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { homedir } from "os";
import { getFindrPath } from "./utils";

const GITHUB_NEW_ISSUE =
  "https://github.com/Roderick111/findr/issues/new?labels=bug";

function redactHomePaths(text: string): string {
  const home = homedir();
  if (home && text.includes(home)) {
    return text.split(home).join("~");
  }
  return text;
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}... (truncated)`;
}

interface DoctorSummary {
  version?: string;
  filesIndexed?: number;
  contentIndexed?: number;
  ocrBinaryFound?: boolean;
  scanPreset?: string;
  warnings?: string[];
  recentErrorCount?: number;
}

function buildDoctorSummary(doctorJson: string): DoctorSummary {
  try {
    const doc = JSON.parse(doctorJson) as Record<string, unknown>;
    const recent =
      typeof doc.recent_errors === "string" ? doc.recent_errors : "";
    const warnings = Array.isArray(doc.warnings)
      ? doc.warnings.filter((w): w is string => typeof w === "string")
      : [];
    const database = doc.database as Record<string, unknown> | undefined;
    const ocr = doc.ocr as Record<string, unknown> | undefined;
    return {
      version: typeof doc.version === "string" ? doc.version : undefined,
      filesIndexed:
        typeof database?.files_indexed === "number"
          ? database.files_indexed
          : undefined,
      contentIndexed:
        typeof database?.content_indexed === "number"
          ? database.content_indexed
          : undefined,
      ocrBinaryFound:
        typeof ocr?.binary_found === "boolean" ? ocr.binary_found : undefined,
      scanPreset:
        typeof doc.scan_preset === "string" ? doc.scan_preset : undefined,
      warnings,
      recentErrorCount: recent
        .split("\n")
        .filter((line) => line.trim().length > 0).length,
    };
  } catch {
    return {};
  }
}

function formatSummary(summary: DoctorSummary): string {
  const lines = [
    `- Findr version: ${summary.version ?? "unknown"}`,
    `- Files indexed: ${summary.filesIndexed ?? "?"}`,
    `- Content indexed: ${summary.contentIndexed ?? "?"}`,
    `- OCR binary: ${summary.ocrBinaryFound ? "found" : "missing"}`,
    `- Scan preset: ${summary.scanPreset ?? "unknown"}`,
  ];
  if (summary.warnings?.length) {
    for (const w of summary.warnings) {
      lines.push(`- Warning: ${w}`);
    }
  }
  if (summary.recentErrorCount !== undefined) {
    lines.push(`- Recent error log lines: ${summary.recentErrorCount}`);
  }
  return lines.join("\n");
}

/**
 * Open a bug report URL. Runs findr doctor asynchronously (non-blocking),
 * copies redacted diagnostics to clipboard, and opens a short GitHub issue URL.
 */
export async function openBugReport(errorMessage?: string): Promise<void> {
  const doctorOutput = await new Promise<string>((resolve) => {
    try {
      const findrPath = getFindrPath();
      execFile(
        findrPath,
        ["doctor", "--json"],
        { timeout: 5000 },
        (err, stdout) => {
          resolve(err ? "(findr doctor failed)" : stdout);
        },
      );
    } catch {
      resolve("(findr doctor failed)");
    }
  });

  const redactedDoctor = truncateText(redactHomePaths(doctorOutput), 8000);
  const summary = buildDoctorSummary(redactedDoctor);

  const fullReport = [
    "## What happened",
    "",
    "<!-- Describe what you were doing and what went wrong -->",
    "",
    "## Environment",
    "",
    `- Raycast extension: ${environment.extensionName}`,
    `- Platform: ${process.platform} ${process.arch}`,
    "",
    "## Diagnostic summary",
    "",
    formatSummary(summary),
    "",
    "## Full diagnostics (redacted)",
    "",
    "```json",
    redactedDoctor,
    "```",
    errorMessage
      ? `\n## Error\n\n\`\`\`\n${truncateText(redactHomePaths(errorMessage), 2000)}\n\`\`\``
      : "",
    "",
    "_Paste this report if the GitHub issue body is too short._",
  ].join("\n");

  await Clipboard.copy(fullReport);

  const title = errorMessage
    ? `Bug: ${errorMessage.slice(0, 80)}`
    : "Bug report from Raycast extension";

  const body = [
    "## What happened",
    "",
    "<!-- Describe what you were doing and what went wrong -->",
    "",
    "## Environment",
    "",
    `- Raycast extension: ${environment.extensionName}`,
    `- Platform: ${process.platform} ${process.arch}`,
    "",
    "## Diagnostic summary",
    "",
    formatSummary(summary),
    "",
    "_Full redacted diagnostics were copied to your clipboard — paste them here if needed._",
    errorMessage
      ? `\n## Error\n\n\`\`\`\n${truncateText(redactHomePaths(errorMessage), 500)}\n\`\`\``
      : "",
  ].join("\n");

  const params = new URLSearchParams({
    title,
    body,
    labels: "bug",
  });

  await showToast({
    style: Toast.Style.Animated,
    title: "Opening bug report",
    message: "Diagnostics copied to clipboard",
  });

  await open(`${GITHUB_NEW_ISSUE}?${params.toString()}`);
}
