import { showInFinder } from "@raycast/api";
import { writeFile, readFile, mkdir } from "fs/promises";
import { homedir } from "os";
import { dirname, join } from "path";
import { bulkImport, getAll, type NewRadio } from "./radioDB";
import { createLog } from "./debug";

const log = createLog("radioImportExport");

export interface ImportResult {
  imported: number;
  skippedDuplicates: number;
  skippedInvalid: number;
}

function defaultExportPath(): string {
  const now = new Date();
  const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");

  return join(homedir(), "Downloads", `audiocast-radios-${date}.json`);
}

export async function exportRadios(): Promise<string> {
  const stations = await getAll();
  const path = defaultExportPath();

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(stations, null, 2), "utf8");

  try {
    await showInFinder(path);
  } catch (error) {
    log.error(`Failed to reveal exported file: ${error}`);
  }

  return path;
}

function toStation(entry: unknown): NewRadio | null {
  if (typeof entry !== "object" || entry === null) {
    return null;
  }

  const { url, title, description } = entry as Record<string, unknown>;

  if (typeof url !== "string" || !URL.canParse(url)) {
    return null;
  }

  const stationTitle = typeof title === "string" && title.trim() ? title.trim() : new URL(url).hostname;

  // Ignore items w/o title
  if (!stationTitle) {
    return null;
  }

  const stationDescription = typeof description === "string" && description.trim() ? description : null;

  return { url, title: stationTitle, description: stationDescription };
}

export async function importRadios(path: string): Promise<ImportResult> {
  const raw = await readFile(path, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid radios file: expected a JSON array of radio stations");
  }

  const stations: NewRadio[] = [];
  let skippedInvalid = 0;

  for (const entry of parsed) {
    const station = toStation(entry);

    if (station) {
      stations.push(station);
    } else {
      skippedInvalid += 1;
    }
  }

  const { imported, skipped } = await bulkImport(stations);

  return { imported, skippedDuplicates: skipped, skippedInvalid };
}
