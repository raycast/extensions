import { Clipboard, Toast, open, showInFinder, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Course, StreamItem } from "../api/classroom";
import { DownloadResult, downloadAttachments as download } from "./files";
import { getItemDetails } from "./formatters";

function getFolderName(item: StreamItem, course: Course) {
  return `${course.name} - ${item.title}`.slice(0, 120);
}

const count = (files: number) => `${files} ${files === 1 ? "file" : "files"}`;

// The files that are missing from a download, if any
function getProblems({ skipped, failed }: DownloadResult): string | undefined {
  const problems = [
    failed.length > 0 && `Failed: ${failed.map(({ name, message }) => `${name} (${message})`).join(", ")}`,
    skipped.length > 0 && `Can't be downloaded: ${skipped.join(", ")}`,
  ].filter(Boolean);
  return problems.length > 0 ? problems.join(" · ") : undefined;
}

// Downloads the attachments of the post, or the files the user submitted for it
export async function downloadAttachments(item: StreamItem, course: Course, options?: { submission?: boolean }) {
  const controller = new AbortController();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: options?.submission ? "Downloading submission…" : "Downloading attachments…",
    primaryAction: { title: "Cancel Download", onAction: () => controller.abort() },
  });

  try {
    const attachments = options?.submission ? (item.submission?.attachments ?? []) : item.attachments;
    const result = await download(attachments, {
      folderName: `${getFolderName(item, course)}${options?.submission ? " (Submission)" : ""}`,
      onProgress: (message) => (toast.message = message),
      signal: controller.signal,
    });
    const { paths, failed } = result;
    if (paths.length === 0 && !controller.signal.aborted) {
      throw new Error(getProblems(result) ?? "None of the files can be downloaded");
    }

    if (controller.signal.aborted) {
      toast.style = Toast.Style.Failure;
      toast.title = "Download cancelled";
      toast.message = paths.length > 0 ? `Kept the ${count(paths.length)} already downloaded` : undefined;
    } else {
      toast.style = failed.length > 0 ? Toast.Style.Failure : Toast.Style.Success;
      toast.title =
        failed.length > 0
          ? `Downloaded ${paths.length} of ${count(paths.length + failed.length)}`
          : `Downloaded ${count(paths.length)}`;
      toast.message = getProblems(result);
    }
    toast.primaryAction =
      paths.length > 0 ? { title: "Show in Folder", onAction: () => showInFinder(paths[0]) } : undefined;
    if (paths.length === 1) toast.secondaryAction = { title: "Open File", onAction: () => open(paths[0]) };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Download failed";
    toast.message = error instanceof Error ? error.message : "Unknown error";
    toast.primaryAction = undefined;
  }
}

// Raycast has no API to attach files to AI Chat, so the attachments and the details are pasted into it
export async function sendToAIChat(item: StreamItem, course: Course, topic?: string) {
  const controller = new AbortController();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Preparing AI Chat…",
    primaryAction: { title: "Cancel", onAction: () => controller.abort() },
  });

  try {
    const result = await download(item.attachments, {
      folderName: getFolderName(item, course),
      forAI: true,
      onProgress: (message) => (toast.message = message),
      signal: controller.signal,
    });

    await toast.hide();
    if (controller.signal.aborted) return;

    // `launchCommand` can't reach Raycast's built-in commands, their deeplinks can
    await open("raycast://extensions/raycast/ai/ai-chat");

    // Pasting a file in the chat attaches it, once its window had the time to get focused.
    // The details are pasted as well since the deeplink's `fallbackText` doesn't survive attaching a file.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    for (const path of result.paths) {
      await Clipboard.paste({ file: path });
    }
    await Clipboard.paste(`${getItemDetails(item, course, topic)}\n\n`);

    const problems = getProblems(result);
    if (problems) {
      await showToast({ style: Toast.Style.Failure, title: "Some attachments weren't sent", message: problems });
    }
  } catch (error) {
    // The progress toast is hidden by now, so the failure needs one of its own
    await toast.hide();
    await showFailureToast(error, { title: "Couldn't send to AI Chat" });
  }
}
