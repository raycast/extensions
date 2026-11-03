import { mkdir, open, rm, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { migrationReport, reviewSnippets } from "./migration";
import type { MigrationSession, RaycastSnippet } from "./types";

export function validateFilename(filename: string): string | undefined {
  if (!filename.trim()) return "Enter a filename.";
  if (basename(filename) !== filename || /[\\/:\0]/.test(filename) || !filename.endsWith(".json")) {
    return "Use a filename ending in .json, without a folder path.";
  }
}

async function exportSnippets(options: {
  directory: string;
  filename: string;
  snippets: RaycastSnippet[];
}): Promise<string> {
  const error = validateFilename(options.filename);
  if (error) throw new Error(error);
  if (options.snippets.length === 0) throw new Error("Select at least one snippet to export.");
  const filePath = join(options.directory, options.filename);
  // Match Raycast's import schema and keep review metadata out of the file.
  const snippets = options.snippets.map(({ name, text, keyword }) => ({
    name,
    text,
    ...(keyword ? { keyword } : {}),
  }));
  await writePrivateJson(filePath, snippets);
  return filePath;
}

async function writePrivateJson(filePath: string, value: unknown) {
  const data = `${JSON.stringify(value, null, 2)}\n`;
  const file = await open(filePath, "wx", 0o600);
  try {
    await writeFile(file, data);
    await file.close();
  } catch (error) {
    await Promise.allSettled([file.close(), unlink(filePath)]);
    throw error;
  }
}

export type ExportMode = "single" | "groups" | "report";

export async function exportMigration(options: {
  directory: string;
  filename: string;
  mode: ExportMode;
  includeReport: boolean;
  session: MigrationSession;
}) {
  const error = validateFilename(options.filename);
  if (error) throw new Error(error);
  const selected = new Set(options.session.selectedIds);
  const items = reviewSnippets(options.session).filter((item) => selected.has(item.id));
  if (!items.length && options.mode !== "report") throw new Error("Select at least one snippet to export.");
  const paths: string[] = [];
  let createdDirectory: string | undefined;
  try {
    let outputDirectory = options.directory;
    if (options.mode === "groups") {
      const destination = join(options.directory, `${options.filename.slice(0, -5)}-groups`);
      await mkdir(destination, { mode: 0o700 });
      createdDirectory = destination;
      outputDirectory = destination;
      const groups = new Map<string, RaycastSnippet[]>();
      for (const item of items) groups.set(item.group, [...(groups.get(item.group) ?? []), item.snippet]);
      let index = 0;
      for (const [group, snippets] of groups) {
        const slug =
          group
            .normalize("NFKC")
            .replace(/[^\p{L}\p{N}._-]+/gu, "-")
            .slice(0, 64) || "ungrouped";
        const filename = `${String(++index).padStart(3, "0")}-${slug}.json`;
        paths.push(await exportSnippets({ directory: outputDirectory, filename, snippets }));
      }
    } else if (options.mode === "single") {
      paths.push(
        await exportSnippets({
          directory: outputDirectory,
          filename: options.filename,
          snippets: items.map((item) => item.snippet),
        }),
      );
    }
    let reportPath: string | undefined;
    if (options.includeReport || options.mode === "report") {
      reportPath = join(
        outputDirectory,
        options.mode === "report" ? options.filename : `${options.filename.slice(0, -5)}.report.json`,
      );
      await writePrivateJson(reportPath, migrationReport(options.session, options.mode !== "report"));
      paths.push(reportPath);
    }
    return { paths, reportPath, directory: createdDirectory, count: options.mode === "report" ? 0 : items.length };
  } catch (error) {
    // Attempt every rollback step without replacing the original export error.
    await Promise.allSettled(paths.map((path) => unlink(path)));
    if (createdDirectory) await Promise.allSettled([rm(createdDirectory, { recursive: true, force: true })]);
    throw error;
  }
}
