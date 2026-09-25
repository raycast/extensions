import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { failToast } from "@chrismessina/raycast-kit";
import { countOf } from "@chrismessina/raycast-kit/plural";
import { format } from "date-fns";
import { Action, ActionPanel, Icon, showInFinder, showToast, Toast } from "@raycast/api";
import { toCsv, toMarkdownTable, toTsv } from "../lib/export-format";

type ExportActionsProps = {
  /** Used as the file's basename, before the timestamp + extension. */
  filenameBase: string;
  columns: string[];
  rows: string[][];
};

async function exportRows(
  props: ExportActionsProps,
  ext: string,
  serialize: (columns: string[], rows: string[][]) => string,
) {
  const toast = await showToast(Toast.Style.Animated, "Exporting");
  try {
    const content = serialize(props.columns, props.rows);
    const filePath = join(homedir(), "Downloads", `${props.filenameBase}-${format(new Date(), "yyyyMMddHHmm")}${ext}`);
    writeFileSync(filePath, content, "utf8");
    toast.style = Toast.Style.Success;
    toast.title = `Exported ${countOf(props.rows.length, "row")}`;
    toast.primaryAction = { title: "Show in Finder", onAction: () => showInFinder(filePath) };
  } catch (error) {
    failToast(toast, error, { title: "Export failed" });
  }
}

/** Submenu offering CSV/Markdown/plain-text export of the caller's currently loaded rows. */
export default function ExportActions(props: ExportActionsProps) {
  return (
    <ActionPanel.Submenu title="Export" icon={Icon.Download}>
      <Action title="Export as CSV" onAction={() => exportRows(props, ".csv", toCsv)} />
      <Action title="Export as Markdown" onAction={() => exportRows(props, ".md", toMarkdownTable)} />
      <Action title="Export as Plain Text" onAction={() => exportRows(props, ".txt", toTsv)} />
    </ActionPanel.Submenu>
  );
}
