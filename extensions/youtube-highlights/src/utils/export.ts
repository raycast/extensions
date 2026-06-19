import { Highlight } from "./storage";
import { showToast, Toast, open } from "@raycast/api";
import fs from "fs";
import path from "path";
import os from "os";

function getExportPath(extension: string): string {
  const documentsPath = path.join(os.homedir(), "Documents", "Highlights");
  if (!fs.existsSync(documentsPath)) {
    fs.mkdirSync(documentsPath, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(documentsPath, `highlights-${timestamp}.${extension}`);
}

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return "00:00:00";
  const date = new Date(0);
  date.setSeconds(seconds);
  return date.toISOString().slice(11, 19);
}

export async function exportToMarkdown(highlights: Highlight[]) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Exporting to Markdown..." });

  try {
    const filePath = getExportPath("md");
    let content = "# YouTube Highlights\n\n";

    const grouped = highlights.reduce(
      (acc, h) => {
        const key = h.videoUrl || "unknown";
        if (!acc[key]) acc[key] = [];
        acc[key].push(h);
        return acc;
      },
      {} as Record<string, Highlight[]>,
    );

    for (const url in grouped) {
      const group = grouped[url];
      const title = group[0].videoTitle || "Untitled Video";
      content += `## [${title}](${url})\n\n`;

      for (const h of group) {
        const separator = url.includes("?") ? "&" : "?";
        const timestampUrl = `${url}${separator}t=${Math.floor(h.startTime)}s`;

        content += `- [${formatTime(h.startTime)} - ${formatTime(h.endTime)}](${timestampUrl})`;
        if (h.text) {
          content += `\n  > ${h.text.replace(/\n/g, "\n  > ")}`;
        }
        content += "\n";
      }
      content += "\n";
    }

    fs.writeFileSync(filePath, content);

    toast.style = Toast.Style.Success;
    toast.title = "Exported Successfully";
    toast.message = `Saved to ${path.basename(filePath)}`;
    await open(path.dirname(filePath));
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Export Failed";
    toast.message = String(error);
    throw error;
  }
}

export async function exportToJSON(highlights: Highlight[]) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Exporting to JSON..." });
  try {
    const filePath = getExportPath("json");
    fs.writeFileSync(filePath, JSON.stringify(highlights, null, 2));

    toast.style = Toast.Style.Success;
    toast.title = "Exported Successfully";
    toast.message = `Saved to ${path.basename(filePath)}`;
    await open(path.dirname(filePath));
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Export Failed";
    toast.message = String(error);
    throw error;
  }
}

function csvEscape(value: string): string {
  if (!value) return "";

  const needsQuoting = value.includes('"') || value.includes(",") || value.includes("\n");

  if (needsQuoting) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export async function exportToCSV(highlights: Highlight[]) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Exporting to CSV..." });
  try {
    const filePath = getExportPath("csv");
    const headers = ["ID", "Video Title", "Video URL", "Start Time", "End Time", "Text", "Created At"];
    const rows = highlights.map((h) => [
      csvEscape(h.id),
      csvEscape(h.videoTitle || ""),
      csvEscape(h.videoUrl || ""),
      formatTime(h.startTime),
      formatTime(h.endTime),
      csvEscape(h.text || ""),
      new Date(h.createdAt).toISOString(),
    ]);

    const content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    fs.writeFileSync(filePath, content);

    toast.style = Toast.Style.Success;
    toast.title = "Exported Successfully";
    toast.message = `Saved to ${path.basename(filePath)}`;
    await open(path.dirname(filePath));
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Export Failed";
    toast.message = String(error);
    throw error;
  }
}
