import { showHUD, Clipboard, getSelectedFinderItems, showToast, Toast, getPreferenceValues } from "@raycast/api";
import path from "path";

export default async function main() {
  try {
    const { apiKey } = getPreferenceValues<Preferences>();

    if (!apiKey || apiKey.trim().length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Missing API Key",
        message: "Set the API Key in this command's preferences",
      });
      return;
    }

    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No items selected",
        message: "Please select a file in Finder",
      });
      return;
    }

    const filePath = selectedItems[0].path;

    await showHUD("Uploading...");

    const uploadUrl = "https://upload.fakecrime.bio";

    // Build multipart form data using Node 20's FormData
    const formData = new FormData();
    const fs = await import("fs");
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const contentType = getContentType(fileName);
    // Convert Node Buffer -> real ArrayBuffer to satisfy DOM BlobPart types
    const arrayBuffer = new ArrayBuffer(fileBuffer.byteLength);
    const view = new Uint8Array(arrayBuffer);
    view.set(fileBuffer);
    const blob = new Blob([arrayBuffer], { type: contentType });
    formData.append("file", blob, fileName);

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Secret: apiKey,
        "User-Agent": "Raycast-Upload-Image",
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await safeReadText(response);
      await Clipboard.copy(errorText);
      await showToast({
        style: Toast.Style.Failure,
        title: `Upload failed (${response.status})`,
        message: "Error copied to clipboard",
      });
      return;
    }

    const resultText = await response.text();
    // Try to parse for url (supports both legacy { url } and new { data: { url } })
    try {
      const parsed = JSON.parse(resultText) as { url?: string; data?: { url?: string } };
      const candidate = parsed.url ?? parsed.data?.url;
      const urlToCopy = typeof candidate === "string" && candidate.length > 0 ? candidate : resultText;
      await Clipboard.copy(urlToCopy);
    } catch {
      await Clipboard.copy(resultText);
    }

    await showHUD("File uploaded and URL copied");
  } catch (error) {
    const message = (error as Error).message ?? String(error);
    await Clipboard.copy(message);
    await showHUD("Error: " + message);
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

function getContentType(fileName: string): string {
  const ext = path.extname(fileName.toLowerCase());
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".png": "image/png",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
  };
  return map[ext] ?? "application/octet-stream";
}
