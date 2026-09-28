import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { uploadClipboard } from "./api/client";
import { showAktarFailure } from "./lib/errors";
import { fetchFormat, formatUploads } from "./lib/output";

/** Aktar reads the clipboard itself, so copied Finder files and raw screenshots both work. */
export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading clipboard" });
  try {
    const upload = await uploadClipboard();
    await Clipboard.copy(formatUploads([upload], await fetchFormat()));
    await toast.hide();
    await showHUD(`Uploaded ${upload.filename}, link copied`);
  } catch (error) {
    await showAktarFailure(error, "Couldn't upload the clipboard");
  }
}
