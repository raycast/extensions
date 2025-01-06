import { writeFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { getJournalEntries } from "./storage";
import type { JournalEntry } from "../types";

function generateMarkdownExport(entries: JournalEntry[]): string {
  return entries
    .map(
      (entry) => `# ${new Date(entry.date).toLocaleDateString()}

*${entry.prompt}*

${entry.content}

---`,
    )
    .join("\n\n");
}

export async function exportMeditations(format: "markdown" | "json" = "markdown") {
  try {
    const entries = await getJournalEntries();
    const exportDir = join(homedir(), "Downloads", "marcus-exports");

    if (!existsSync(exportDir)) {
      await mkdir(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().split("T")[0];
    const fileName = `marcus-meditations-${timestamp}.${format}`;
    const filePath = join(exportDir, fileName);

    const content = format === "markdown" ? generateMarkdownExport(entries) : JSON.stringify(entries, null, 2);

    await writeFile(filePath, content);
    return filePath;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Export failed: ${errorMessage}`);
  }
}
