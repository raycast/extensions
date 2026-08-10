import { getApplications, showToast, Toast, open } from "@raycast/api";
import { existsSync } from "fs";
import { parse } from "csv-parse/sync";
import { FORSCORE_BUNDLE_ID, FORSCORE_WEBSITE } from "../constants/constants";
import { Score } from "../types/Score";

async function isForScoreInstalled(): Promise<boolean> {
  const applications = await getApplications();
  return applications.some((app) => app.bundleId === FORSCORE_BUNDLE_ID);
}

export function validateForScoreCSV(path: string): string | null {
  if (!path) {
    return "Please select a file";
  }

  if (!existsSync(path)) {
    return "File does not exist";
  }

  if (!path.endsWith(".csv")) {
    return "File must be a CSV file";
  }

  return null;
}

export async function checkForScoreInstallation(): Promise<boolean> {
  const isInstalled = await isForScoreInstalled();

  if (!isInstalled) {
    await showToast({
      style: Toast.Style.Failure,
      title: "forScore is not installed",
      message: `Install it from: ${FORSCORE_WEBSITE}`,
      primaryAction: {
        title: `Go to ${FORSCORE_WEBSITE}`,
        onAction: (toast) => {
          open(FORSCORE_WEBSITE);
          toast.hide();
        },
      },
    });
  }

  return isInstalled;
}

export function parseCSV(csvContent: string): Score[] {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true, // Allow records with varying column counts
  }) as Record<string, string>[];

  return records.map((record) => ({
    filename: record["Arkivnavn"] || "",
    title: record["Titel"] || record["Arkivnavn"]?.replace(".pdf", "") || "",
    startPage: record["Startside (bogmærke)"],
    endPage: record["Slutside (bogmærke)"],
    composers: record["Komponister"],
    genres: record["Genrer"],
    tags: record["Tags"],
    labels: record["Etiketter"],
    id: record["Id"],
    rating: record["Vurdering"],
    difficulty: record["Sværhedsgrad"],
    minutes: record["Minutter"],
    seconds: record["Seconds"],
    keysf: record["keysf"],
    keymi: record["keymi"],
  }));
}

export function openScore(score: Score) {
  // Use filename with .pdf extension for path parameter
  const encodedPath = encodeURIComponent(score.filename);
  open(`forscore://open?path=${encodedPath}`);
}
