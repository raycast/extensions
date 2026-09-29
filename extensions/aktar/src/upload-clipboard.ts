import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { uploadClipboard } from "./api/client";
import { showAktarFailure } from "./lib/errors";
import { EXPIRY_UNSUPPORTED_MESSAGE, ignoredExpiry, preferredExpiry } from "./lib/expiry";
import { fetchFormat, formatUploads } from "./lib/output";

/** Aktar reads the clipboard itself, so copied Finder files and raw screenshots both work. */
export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading clipboard" });
  try {
    const expires = preferredExpiry();
    const upload = await uploadClipboard({ expires });
    await Clipboard.copy(formatUploads([upload], await fetchFormat()));
    if (ignoredExpiry([upload], expires)) {
      toast.style = Toast.Style.Failure;
      toast.title = `Uploaded ${upload.filename}`;
      toast.message = `Link copied. ${EXPIRY_UNSUPPORTED_MESSAGE}`;
      return;
    }
    await toast.hide();
    await showHUD(`Uploaded ${upload.filename}, link copied`);
  } catch (error) {
    await showAktarFailure(error, "Couldn't upload the clipboard");
  }
}
