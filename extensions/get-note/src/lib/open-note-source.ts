import { Toast, open, showToast } from "@raycast/api";

import { getNoteDetail } from "./api";
import { normalizeGetNoteError } from "./errors";
import { toOpenableExternalUrl } from "./note-url";

export async function openNoteSourceInBrowser(noteId: string): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Loading Source URL",
  });

  try {
    const note = await getNoteDetail(noteId);
    const sourceUrl = toOpenableExternalUrl(note.web_page?.url);

    if (!sourceUrl) {
      toast.style = Toast.Style.Failure;
      toast.title = "No Source URL";
      toast.message = "This note does not have a valid http(s) source URL.";
      return;
    }

    await open(sourceUrl);
    toast.style = Toast.Style.Success;
    toast.title = "Opened in Browser";
    toast.message = sourceUrl;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to Open Source URL";
    toast.message = normalizeGetNoteError(error);
  }
}
