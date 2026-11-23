import { getFrameText } from "qrdx";
import { buildFrame, frameName } from "../frames";
import { loadSavedQRs } from "../storage";
import { type Settings, templateName, toLabel } from "../types";

/** A saved code's frame and its label, or the template it was saved with. */
function frameParts(settings: Settings): string[] {
  const frame = buildFrame(settings);
  if (frame) {
    const label = getFrameText(frame);
    return [`Frame: ${frameName(frame.style)}${label ? ` ("${label}")` : ""}`];
  }
  return settings.templateId
    ? [`Template: ${templateName(settings.templateId)}`]
    : [];
}

/**
 * List all saved QR code configurations from the qrdx library.
 * Returns a summary of each saved QR including name, URL, and style settings.
 */

interface Input {
  /** Optional search term to filter saved QRs by name or URL. */
  query?: string;
}

export default async function listSaved(input: Input): Promise<string> {
  const allSaved = await loadSavedQRs();

  const filtered = input.query?.trim()
    ? allSaved.filter(
        (q) =>
          q.name.toLowerCase().includes(input.query!.toLowerCase()) ||
          q.url.toLowerCase().includes(input.query!.toLowerCase())
      )
    : allSaved;

  if (filtered.length === 0) {
    return input.query
      ? `No saved QR codes matching "${input.query}".`
      : "No saved QR codes yet. Generate a QR code and save it from the preview screen.";
  }

  const lines = filtered.map((q) => {
    const parts = [
      `**${q.name}**`,
      `URL: ${q.url}`,
      `Body: ${toLabel(q.settings.bodyPattern)}`,
      ...frameParts(q.settings),
      ...(q.settings.fgColor === "#000000"
        ? []
        : [`Color: ${q.settings.fgColor}`]),
      `Saved: ${new Date(q.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
    ];
    return parts.join(" · ");
  });

  return `Found ${filtered.length} saved QR code${filtered.length === 1 ? "" : "s"}:\n\n${lines.join("\n")}`;
}
