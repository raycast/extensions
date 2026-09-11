import { readFile } from "fs/promises";
import * as path from "path";

const LITTERBOX_API = "https://litterbox.catbox.moe/resources/internals/api.php";

export type ExpiryTime = "1h" | "12h" | "24h" | "72h";

export const EXPIRY_OPTIONS: { value: ExpiryTime; label: string }[] = [
  { value: "1h", label: "1 hour" },
  { value: "12h", label: "12 hours" },
  { value: "24h", label: "24 hours" },
  { value: "72h", label: "72 hours" },
];

/**
 * Upload a file to Litterbox. Returns the shareable URL (plain text response).
 */
export async function uploadFile(filePath: string, time: ExpiryTime): Promise<string> {
  const buffer = await readFile(filePath);
  const filename = path.basename(filePath);
  const fileBytes = new Uint8Array(buffer);
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("time", time);
  form.append("fileToUpload", new Blob([fileBytes]), filename);

  const res = await fetch(LITTERBOX_API, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
  }

  const url = (await res.text()).trim();
  if (!url || !url.startsWith("http")) {
    throw new Error(url || "No URL returned from Litterbox");
  }
  return url;
}
