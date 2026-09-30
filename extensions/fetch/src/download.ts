import { randomUUID } from "crypto";
import { releaseReservation } from "@chrismessina/raycast-downloader/paths";
import { showError } from "@chrismessina/raycast-kit";
import { Clipboard, launchCommand, LaunchProps, LaunchType } from "@raycast/api";
import { downloadFile, shouldReleaseReservation } from "./lib/downloader";
import { addToHistory } from "./lib/history";
import { logDebug, logInfo } from "./lib/logger";
import { getPreferences } from "./lib/preferences";
import {
  showDownloadComplete,
  showDownloadError,
  showDownloadProgress,
  showDownloadStarted,
  showValidationError,
} from "./lib/progress";
import {
  cleanUrl,
  expandRangeUrl,
  extractUrlStringsFromText,
  getRangeInfo,
  hasRangePattern,
  isValidUrl,
  resolveOutputPath,
} from "./lib/url-utils";

export default async function Command(props: LaunchProps<{ arguments: Arguments.Download }>) {
  const preferences = getPreferences();

  // Get URL from argument or clipboard. The argument is declared optional in the
  // manifest, so it can be absent at runtime despite the generated type.
  let url: string | undefined = props.arguments.url?.trim();
  let source: "argument" | "clipboard" = "argument";

  if (!url) {
    logDebug("No URL argument, checking clipboard");
    const clipboardText = (await Clipboard.readText())?.trim();
    // The clipboard holds whatever was copied last — a shell command, a paragraph,
    // a file path. Only adopt it when it actually contains a URL. Taking it blind
    // reported "Invalid URL: cd /Users/… && npm install" for something the user
    // never typed and could not act on. Same guard `download-batch` already uses,
    // so prose with a link in it still works.
    const fromClipboard = clipboardText ? extractUrlStringsFromText(clipboardText)[0] : undefined;
    if (fromClipboard) {
      url = fromClipboard;
      source = "clipboard";
    }
  }

  if (!url) {
    await showValidationError("No URL provided. Pass a URL as the argument, or copy one to the clipboard.");
    return;
  }

  // Strip trailing prose punctuation that often comes along from copy-paste.
  url = cleanUrl(url);

  logInfo("Download command invoked", { url, source });

  // Check for range pattern (e.g., https://example.com/file[001-025].zip)
  if (hasRangePattern(url)) {
    const rangeInfo = getRangeInfo(url);
    logInfo("Range pattern detected, launching batch download", {
      url,
      count: rangeInfo?.count,
      start: rangeInfo?.start,
      end: rangeInfo?.end,
    });

    // Expand the range and pass to batch download
    const expandedUrls = expandRangeUrl(url);

    await launchCommand({
      name: "download-batch",
      type: LaunchType.UserInitiated,
      context: { urls: expandedUrls, outputDirectory: preferences.outputDirectory },
    });
    return;
  }

  // Validate URL (single URL, no range pattern)
  if (!isValidUrl(url)) {
    await showValidationError(`Invalid URL: ${url}`);
    return;
  }

  // Resolving the output path reserves a `.part` and can fail outright — an
  // unwritable or missing output directory throws here, BEFORE the first toast
  // exists. Without this catch a no-view command just exits: no error, no Copy
  // Error action, nothing on screen at all.
  let filename: string;
  let outputPath: string;
  try {
    ({ filename, outputPath } = await resolveOutputPath(
      url,
      preferences.outputDirectory,
      preferences.overwriteExisting,
    ));
  } catch (error) {
    await showError(error, {
      title: "Could Not Start Download",
      message: `Check that ${preferences.outputDirectory} exists and is writable.`,
    });
    return;
  }

  logDebug("Output path resolved", { filename, outputPath });

  // Show the progress toast before any work starts, so the command is never silent.
  const toast = await showDownloadStarted(filename);

  // Start download
  const handle = downloadFile(
    {
      url,
      outputPath,
      followRedirects: preferences.followRedirects,
      timeout: preferences.defaultTimeout,
    },
    async (progress) => {
      await showDownloadProgress(toast, filename, progress);
    },
  );

  // Wait for completion
  const result = await handle.promise;

  if (shouldReleaseReservation(result)) {
    releaseReservation(outputPath);
  }

  if (result.success) {
    await showDownloadComplete(toast, filename, result.outputPath ?? outputPath);
    await addToHistory({
      id: result.id ?? randomUUID(),
      url,
      filename,
      outputPath,
      status: "completed",
      bytesDownloaded: result.bytesDownloaded,
    });
  } else {
    await showDownloadError(toast, filename, result.error || "Unknown error", url);
    await addToHistory({
      id: result.id ?? randomUUID(),
      url,
      filename,
      outputPath,
      status: "failed",
      error: { code: result.errorCode ?? "unknown", message: result.error ?? "Unknown error" },
    });
  }
}
