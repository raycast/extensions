import { Clipboard, Toast, showInFinder, showToast } from "@raycast/api";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { Subscription } from "./types";

const CSV_COLUMNS: (keyof Subscription)[] = [
  "id",
  "name",
  "amount",
  "currency",
  "billingCycle",
  "billingDay",
  "startDate",
  "category",
  "list",
  "status",
  "paymentMethod",
  "notes",
  "iconUrl",
  "color",
];

function csvCell(value: unknown): string {
  if (value === undefined || value === null) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toJSON(subscriptions: Subscription[]): string {
  return JSON.stringify(subscriptions, null, 2);
}

export function toCSV(subscriptions: Subscription[]): string {
  const header = CSV_COLUMNS.join(",");
  const rows = subscriptions.map((sub) => CSV_COLUMNS.map((col) => csvCell(sub[col])).join(","));
  return [header, ...rows].join("\n");
}

function timestampedFilename(prefix: string, extension: string): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${prefix}-${date}-${time}.${extension}`;
}

async function saveToDownloads(contents: string, prefix: string, extension: string): Promise<string> {
  const filePath = join(homedir(), "Downloads", timestampedFilename(prefix, extension));
  await writeFile(filePath, contents, "utf-8");
  return filePath;
}

export async function exportToFile(subscriptions: Subscription[], format: "json" | "csv"): Promise<void> {
  if (subscriptions.length === 0) {
    await showToast({ style: Toast.Style.Failure, title: "Nothing to export" });
    return;
  }
  try {
    const contents = format === "json" ? toJSON(subscriptions) : toCSV(subscriptions);
    const filePath = await saveToDownloads(contents, "subscriptions", format);
    await showToast({
      style: Toast.Style.Success,
      title: `Exported ${subscriptions.length} subscription${subscriptions.length !== 1 ? "s" : ""}`,
      message: `Saved to Downloads as ${format.toUpperCase()}`,
      primaryAction: {
        title: "Show in Finder",
        onAction: () => showInFinder(filePath),
      },
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Export failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function copyToClipboard(subscriptions: Subscription[], format: "json" | "csv"): Promise<void> {
  if (subscriptions.length === 0) {
    await showToast({ style: Toast.Style.Failure, title: "Nothing to export" });
    return;
  }
  const contents = format === "json" ? toJSON(subscriptions) : toCSV(subscriptions);
  try {
    await Clipboard.copy(contents);
    await showToast({
      style: Toast.Style.Success,
      title: `Copied ${subscriptions.length} subscription${subscriptions.length !== 1 ? "s" : ""}`,
      message: `As ${format.toUpperCase()}`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Copy failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Save a pre-built report string (e.g. the analytics Markdown) to ~/Downloads. */
export async function exportReportToFile(report: string, prefix: string): Promise<void> {
  try {
    const filePath = await saveToDownloads(report, prefix, "md");
    await showToast({
      style: Toast.Style.Success,
      title: "Report exported",
      message: "Saved to Downloads as Markdown",
      primaryAction: {
        title: "Show in Finder",
        onAction: () => showInFinder(filePath),
      },
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Export failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Copy a pre-built report string to the clipboard. */
export async function copyReportToClipboard(report: string): Promise<void> {
  try {
    await Clipboard.copy(report);
    await showToast({
      style: Toast.Style.Success,
      title: "Report copied",
      message: "As Markdown",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Copy failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
