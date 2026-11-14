import { getPreferenceValues } from "@raycast/api";
import { getStatus } from "../api/client";
import type { OutputFormat, Status, Upload } from "../api/types";

/** The format from the extension's preferences, or Aktar's own Output setting. */
export function resolveFormat(status: Pick<Status, "outputFormat"> | undefined): OutputFormat {
  const { copyFormat } = getPreferenceValues<Preferences>();
  if (copyFormat && copyFormat !== "aktar") return copyFormat as OutputFormat;
  return status?.outputFormat ?? "url";
}

export async function fetchFormat(): Promise<OutputFormat> {
  const { copyFormat } = getPreferenceValues<Preferences>();
  if (copyFormat && copyFormat !== "aktar") return copyFormat as OutputFormat;
  try {
    return resolveFormat(await getStatus());
  } catch {
    return "url";
  }
}

export function formatUploads(uploads: Upload[], format: OutputFormat) {
  return uploads.map((upload) => upload.formats[format] ?? upload.url).join("\n");
}
