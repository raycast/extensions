import { showError } from "@chrismessina/raycast-kit";
import { Action, ActionPanel, Clipboard, Icon, showHUD, showToast, Toast } from "@raycast/api";
import { awaitDownloadReady, DownloadJobError } from "../fathom/downloads";
import type { Meeting } from "../types/Types";
import { downloadRecording } from "../utils/downloadRecording";
import { showContextualError } from "../utils/errorHandling";

/**
 * Download actions for a meeting recording.
 *
 * The API returns whichever medium the recording actually has — video for a
 * video meeting, audio for an audio-only one — never both, and there is no
 * parameter to request one over the other. So this offers a single
 * "Download Recording" rather than separate video/audio actions: an explicit
 * "Download Audio" would have nothing to call for the video recordings that
 * make up every meeting observed on this account.
 */
export function MeetingDownloadActions(props: { meeting: Meeting; recordingId: string }) {
  const { meeting, recordingId } = props;

  return (
    <ActionPanel.Section title="Download">
      <Action
        title="Download Recording"
        icon={Icon.Download}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "d" },
          Windows: { modifiers: ["ctrl", "shift"], key: "d" },
        }}
        onAction={() => void downloadRecording({ meeting, recordingId })}
      />
      <Action
        title="Copy Download Link"
        icon={Icon.Link}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "l" },
          Windows: { modifiers: ["ctrl", "shift"], key: "l" },
        }}
        onAction={() => void copyDownloadLink(recordingId)}
      />
    </ActionPanel.Section>
  );
}

/**
 * Resolve a job and put the signed URL on the clipboard.
 *
 * Warns about expiry because the link is short-lived (~24h) and pasting it
 * somewhere durable will silently stop working.
 */
async function copyDownloadLink(recordingId: string): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Preparing Link",
    message: "Asking Fathom for this recording…",
  });

  try {
    const media = await awaitDownloadReady(recordingId, {
      onProgress: (_job, elapsed) => {
        const seconds = Math.floor(elapsed / 1000);
        toast.message = seconds < 5 ? "Fathom is preparing this recording…" : `Still preparing… (${seconds}s)`;
      },
    });

    await Clipboard.copy(media.url);
    await toast.hide();
    await showHUD(media.expiresAt ? "Download Link Copied — expires within 24 hours" : "Download Link Copied");
  } catch (error) {
    await toast.hide();
    if (error instanceof DownloadJobError) {
      if (error.kind === "cancelled") return;
      await showError(error, {
        title: error.kind === "no_media" ? "Nothing to Download" : "Could Not Prepare Link",
        message: error.message,
        copyContext: `Job state: ${error.kind}`,
      });
      return;
    }
    await showContextualError(error, { action: "copy download link", fallbackTitle: "Could Not Prepare Link" });
  }
}
