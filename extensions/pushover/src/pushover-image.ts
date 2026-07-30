import { getSelectedFinderItems, showToast, Toast, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import FormData from "form-data";
import { execFile } from "child_process";
import { createReadStream, statSync } from "fs";
import { basename, extname } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Pushover only accepts image attachments, capped at 5 MB.
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const IMAGE_MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

// Prefer the current Finder selection; when Finder is not frontmost (or nothing
// is selected) fall back to the native picker. Returns undefined only when the
// user cancels the picker.
async function resolveImagePath(): Promise<string | undefined> {
  try {
    const [selected] = await getSelectedFinderItems();
    if (selected) {
      return selected.path;
    }
  } catch {
    // getSelectedFinderItems throws when Finder is not the frontmost app; that
    // is the "Finder not forward" case, so fall through to the picker.
  }
  return chooseImageWithDialog();
}

// Show macOS's native image picker. Returns undefined if the user cancels.
async function chooseImageWithDialog(): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("osascript", [
      "-e",
      'POSIX path of (choose file with prompt "Select an image to send via Pushover" of type {"public.png", "public.jpeg", "com.compuserve.gif", "org.webmproject.webp"})',
    ]);
    return stdout.trim();
  } catch {
    // The user canceled the picker (osascript exits non-zero on cancel).
    return undefined;
  }
}

export default async function Command() {
  try {
    const path = await resolveImagePath();
    if (!path) {
      return; // User canceled the picker.
    }

    const mimeType = IMAGE_MIME_TYPES[extname(path).toLowerCase()];
    if (!mimeType) {
      throw new Error("Pushover attachments must be an image (png, jpg, gif, or webp).");
    }

    const { size } = statSync(path);
    if (size > MAX_ATTACHMENT_BYTES) {
      throw new Error(`Image is ${(size / 1024 / 1024).toFixed(1)} MB, over Pushover's 5 MB limit.`);
    }

    const preferences = getPreferenceValues<Preferences>();

    const form = new FormData();
    form.append("token", preferences.pushoverToken);
    form.append("user", preferences.pushoverUser);
    form.append("message", basename(path));
    form.append("attachment", createReadStream(path), {
      filename: basename(path),
      contentType: mimeType,
    });

    const response = await fetch("https://api.pushover.net/1/messages.json", {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    await showToast({
      style: Toast.Style.Success,
      title: "File sent successfully!",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to send file",
      message: String(error),
    });
  }
}
