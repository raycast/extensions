import { Toast, getPreferenceValues, showInFinder, showToast } from "@raycast/api";
import { homedir } from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import { buildWeeks, dayLetters, monthKeyOf, monthLabel } from "./lib/month";
import { chainName, chainPreferences } from "./lib/preferences";
import { CHAIN_IDS, loadChain } from "./lib/store";
import { renderMonthText } from "./lib/text";

export default async function ExportCalendar() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Exporting…" });

  try {
    const { weekStart, cellStyle, showDayLetters } = chainPreferences();
    const letters = showDayLetters ? dayLetters(weekStart) : undefined;

    const blocks: string[] = [];
    for (const [offset, id] of CHAIN_IDS.entries()) {
      const chain = await loadChain(id);
      const months = Object.keys(chain.marks).sort();
      if (months.length === 0) continue;

      const name = chainName(offset + 1);
      blocks.push(`${name}\n${"=".repeat(name.length)}`);

      for (const month of months) {
        const marked = new Set(chain.marks[month]);
        const grid = renderMonthText(buildWeeks(month, weekStart), marked, cellStyle, letters);
        blocks.push(`${monthLabel(month)}   (${marked.size} of ${daysIn(month)} days)\n\n${grid}`);
      }
    }

    if (blocks.length === 0) {
      toast.style = Toast.Style.Failure;
      toast.title = "Nothing to export";
      toast.message = "No days have been crossed off yet.";
      return;
    }

    const header = `Don't Break the Chain — exported ${new Date().toLocaleString()}`;
    const contents = [header, "", ...blocks, ""].join("\n\n");

    const { exportFolder } = getPreferenceValues<Preferences.ExportCalendar>();
    const folder = exportFolder?.trim() || path.join(homedir(), "Downloads");
    const file = path.join(folder, `dont-break-the-chain-${fileStamp()}.txt`);

    await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(file, contents, "utf8");

    toast.style = Toast.Style.Success;
    toast.title = "Exported";
    toast.message = file;
    await showInFinder(file);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Export failed";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}

function daysIn(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

/** `2026-08-08`, in local time. */
function fileStamp(): string {
  const now = new Date();
  return `${monthKeyOf(now)}-${String(now.getDate()).padStart(2, "0")}`;
}
