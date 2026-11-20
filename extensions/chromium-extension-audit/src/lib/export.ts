import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { AuditStore } from "./model";
import { auditReportJson, auditReportMarkdown } from "./report";

export type ReportFormat = "md" | "json";
// Writes a new file and never overwrites an existing report.
export async function exportReport(
  state: AuditStore,
  format: ReportFormat,
  directory = path.join(os.homedir(), "Downloads"),
  at = new Date().toISOString(),
): Promise<string> {
  const stamp = at.slice(0, 19).replace(/:/g, "-");
  const content = format === "md" ? auditReportMarkdown(state, at) : auditReportJson(state, at);
  for (let attempt = 0; ; attempt++) {
    const file = path.join(directory, `extension-audit-${stamp}${attempt ? `-${attempt}` : ""}.${format}`);
    try {
      await fs.writeFile(file, content, { flag: "wx", mode: 0o600 });
      return file;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" || attempt >= 20) throw error;
    }
  }
}
