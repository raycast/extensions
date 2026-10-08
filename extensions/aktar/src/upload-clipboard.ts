import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { uploadClipboard } from "./api/client";
import { showAktarFailure } from "./lib/errors";
import { expiryWarning, preferredExpiry } from "./lib/expiry";
import { fetchFormat, formatUploads } from "./lib/output";

/** Aktar reads the clipboard itself, so files copied in Finder or File Explorer and raw screenshots both work. */
export default async function Command() {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Uploading clipboard" });
  try {
    const expires = preferredExpiry();
    const upload = await uploadClipboard({ expires });
    await Clipboard.copy(formatUploads([upload], await fetchFormat()));
    const warning = expiryWarning([upload], expires);
    if (warning) {
      toast.style = Toast.Style.Failure;
      toast.title = upload.reused ? "Already uploaded" : `Uploaded ${upload.filename}`;
      toast.message = `${upload.reused ? "Copied the existing link" : "Link copied"}. ${warning}`;
      return;
    }
    await toast.hide();
    await showHUD(
      upload.reused ? "Already uploaded, copied the existing link" : `Uploaded ${upload.filename}, link copied`,
    );
  } catch (error) {
    await showAktarFailure(error, "Couldn't upload the clipboard");
  }
}
