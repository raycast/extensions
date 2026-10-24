import { Action, ActionPanel, Clipboard, Detail, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { type JSX, useCallback, useEffect, useRef, useState } from "react";
import {
  AbortedError,
  BundleRestoreError,
  ChromiumRunningError,
  ExtractionError,
  InstallPathError,
  type InstallProgress,
  NetworkError,
  runInstall,
} from "../chromium/installer";
import { getPreferences } from "../preferences";

type Phase = "running" | "done" | "failed" | "cancelled";

type DownloadStats = {
  speedBytesPerSecond: number;
  etaSeconds: number | null;
};

const BAR_WIDTH = 30;
const FILLED_BAR_CHAR = "=";
const EMPTY_BAR_CHAR = " ";
const UPDATE_INTERVAL_MS = 250;
const SNAPSHOT_ORIGIN = "storage.googleapis.com";

const STAGE_LABELS: Record<InstallProgress["stage"], string> = {
  "resolve-revision": "Resolving revision",
  download: "Downloading",
  extract: "Extracting",
  preflight: "Preflight check",
  swap: "Installing",
  xattr: "Clearing quarantine",
  cleanup: "Cleaning up",
  done: "Done",
};

const STAGE_DESCRIPTIONS: Record<InstallProgress["stage"], string> = {
  "resolve-revision": `Fetching the latest Chromium snapshot revision number from \`${SNAPSHOT_ORIGIN}\`.`,
  download: `Streaming the Chromium snapshot archive from \`${SNAPSHOT_ORIGIN}\` directly into a temporary file. Press **⌘.** at any time to cancel.`,
  extract: "Unzipping the archive into a temporary directory.",
  preflight: "Re-checking that no Chromium process is running at the target path before we swap the bundle in.",
  swap: "Moving the newly extracted `Chromium.app` into place at the install target.",
  xattr: "Clearing macOS quarantine attributes so Chromium can launch without a Gatekeeper prompt.",
  cleanup: "Removing the temporary archive and extraction directory.",
  done: "Install finished.",
};

function formatMegabytes(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function formatEta(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) {
    return "—";
  }
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds.toString().padStart(2, "0")}s`;
}

function renderProgressBar(bytesDownloaded: number, bytesTotal: number | null, stats: DownloadStats | null): string[] {
  const speedText =
    stats && stats.speedBytesPerSecond > 0 ? `${formatMegabytes(stats.speedBytesPerSecond)} MB/s` : null;

  if (bytesTotal === null || bytesTotal <= 0) {
    const parts = [`**Downloaded** ${formatMegabytes(bytesDownloaded)} MB`];
    if (speedText) {
      parts.push(`**Speed** ${speedText}`);
    }
    return [parts.join("  ·  ")];
  }

  const ratio = Math.min(1, bytesDownloaded / bytesTotal);
  const filledCount = Math.floor(BAR_WIDTH * ratio);
  const emptyCount = BAR_WIDTH - filledCount;
  const bar = FILLED_BAR_CHAR.repeat(filledCount) + EMPTY_BAR_CHAR.repeat(emptyCount);
  const percent = Math.floor(ratio * 100);

  const statLine = [`**${formatMegabytes(bytesDownloaded)} / ${formatMegabytes(bytesTotal)} MB**`];
  if (speedText) {
    statLine.push(`**${speedText}**`);
  }
  if (stats) {
    statLine.push(`**${formatEta(stats.etaSeconds)}** remaining`);
  }

  return [`\`[${bar}]\`  **${percent}%**`, "", statLine.join("  ·  ")];
}

function renderHeader(appBundlePath: string, revision: string | null): string[] {
  return [
    "# Installing Chromium",
    "",
    `**Revision** ${revision ?? "resolving…"}  `,
    `**Target**  \`${appBundlePath}\``,
    "",
  ];
}

function renderMarkdown(
  appBundlePath: string,
  progress: InstallProgress | null,
  stats: DownloadStats | null,
  phase: Phase,
  errorMessage: string | null,
  errorKind: string,
  priorBundleGone: boolean,
): string {
  const revision = progress && "revision" in progress && progress.revision ? progress.revision : null;

  if (phase === "done") {
    const rev = revision ?? "";
    return [
      "# Chromium Installed",
      "",
      `**Revision ${rev}** is now available at  `,
      `\`${appBundlePath}\`.`,
      "",
      "## Next steps",
      "",
      "- Run **Launch TempChrome** (or press your bound hotkey) to open a fresh temporary profile with this build.",
      "- If macOS shows a Gatekeeper prompt on first launch, choose **Open** — quarantine attributes have already been cleared, so the prompt should not repeat.",
      "",
      "Press **⌘.** to close this view.",
    ].join("\n");
  }

  if (phase === "cancelled") {
    return [
      "# Install Cancelled",
      "",
      `No files were changed at \`${appBundlePath}\`. Temporary download files have been cleaned up.`,
      "",
      "You can run **Install or Update Chromium…** from the TempChrome list whenever you're ready.",
      "",
      "Press **⌘.** to close this view.",
    ].join("\n");
  }

  if (phase === "failed") {
    const remediationLines = priorBundleGone
      ? [
          "",
          "> **Your previous Chromium bundle has been removed. Run Install or Update Chromium… again to recover.**",
          "",
        ]
      : [];
    return [
      "# Install Failed",
      "",
      `**${errorKind}**`,
      "",
      errorMessage ?? "No additional details were reported.",
      ...remediationLines,
      "",
      "## What to try",
      "",
      "- Quit any running Chromium window, then trigger the install again.",
      "- Check your internet connection.",
      "- Press **⌘C** to copy the full error details for debugging, then **⌘.** to close.",
    ].join("\n");
  }

  const headerLines = renderHeader(appBundlePath, revision);

  if (!progress) {
    return [
      ...headerLines,
      "## Starting",
      "",
      `Connecting to \`${SNAPSHOT_ORIGIN}\` to resolve the latest revision…`,
    ].join("\n");
  }

  const stageLabel = STAGE_LABELS[progress.stage];
  const stageDescription = STAGE_DESCRIPTIONS[progress.stage];
  const bodyLines = [`## ${stageLabel}`, "", stageDescription, ""];
  if (progress.stage === "download") {
    bodyLines.push(...renderProgressBar(progress.bytesDownloaded, progress.bytesTotal, stats));
  }
  return [...headerLines, ...bodyLines].join("\n");
}

function renderNavigationTitle(progress: InstallProgress | null, phase: Phase): string {
  if (phase === "done") return "Chromium Installed";
  if (phase === "cancelled") return "Install Cancelled";
  if (phase === "failed") return "Install Failed";
  if (!progress) return "Installing Chromium";
  if (progress.stage === "download" && progress.bytesTotal) {
    const percent = Math.floor((progress.bytesDownloaded / progress.bytesTotal) * 100);
    return `Installing Chromium · ${percent}%`;
  }
  return `Installing Chromium · ${STAGE_LABELS[progress.stage]}`;
}

function errorTitle(error: unknown): string {
  if (error instanceof ChromiumRunningError) return "Chromium is running";
  if (error instanceof NetworkError) return "Download failed";
  if (error instanceof ExtractionError) return "Extraction failed";
  if (error instanceof BundleRestoreError) return "Install path left without Chromium";
  if (error instanceof InstallPathError) return "Could not write to install path";
  if (error instanceof AbortedError) return "Install cancelled";
  return "Install failed";
}

export default function InstallView(): JSX.Element {
  const { binaryPath, appBundlePath } = getPreferences();

  const [progress, setProgress] = useState<InstallProgress | null>(null);
  const [downloadStats, setDownloadStats] = useState<DownloadStats | null>(null);
  const [phase, setPhase] = useState<Phase>("running");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<string>("Install failed");
  const [priorBundleGone, setPriorBundleGone] = useState(false);

  const lastUpdateRef = useRef<{ at: number; stage: string; percent: number }>({
    at: 0,
    stage: "",
    percent: -1,
  });
  const downloadStartRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleProgress = useCallback((next: InstallProgress) => {
    const now = Date.now();
    const last = lastUpdateRef.current;
    const stageChanged = next.stage !== last.stage;

    if (next.stage === "download") {
      if (downloadStartRef.current === null) {
        downloadStartRef.current = now;
      }
    } else {
      downloadStartRef.current = null;
    }

    let percent = last.percent;
    if (next.stage === "download" && next.bytesTotal) {
      percent = Math.floor((next.bytesDownloaded / next.bytesTotal) * 100);
    } else if (next.stage !== "download") {
      percent = -1;
    }

    const percentAdvanced = percent >= 0 && percent - last.percent >= 1;
    const enoughTimePassed = now - last.at >= UPDATE_INTERVAL_MS;

    if (!stageChanged && !percentAdvanced && !enoughTimePassed) {
      return;
    }

    lastUpdateRef.current = { at: now, stage: next.stage, percent };

    if (next.stage === "download" && downloadStartRef.current !== null) {
      const elapsedSeconds = (now - downloadStartRef.current) / 1000;
      const speedBytesPerSecond = elapsedSeconds > 0 ? next.bytesDownloaded / elapsedSeconds : 0;
      const etaSeconds =
        next.bytesTotal !== null && speedBytesPerSecond > 0
          ? Math.max(0, (next.bytesTotal - next.bytesDownloaded) / speedBytesPerSecond)
          : null;
      setDownloadStats({ speedBytesPerSecond, etaSeconds });
    } else {
      setDownloadStats(null);
    }

    setProgress(next);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    let effectDisposed = false;

    let initialToastPromise: Promise<Toast> | null = null;

    const run = async () => {
      initialToastPromise = showToast({
        style: Toast.Style.Animated,
        title: "Resolving latest Chromium revision…",
      });

      try {
        const { revision } = await runInstall({
          binaryPath,
          appBundlePath,
          signal: controller.signal,
          onProgress: handleProgress,
        });
        if (effectDisposed) {
          const toast = await initialToastPromise;
          toast?.hide();
          return;
        }
        setPhase("done");
        const toast = await initialToastPromise;
        toast.hide();
        await showToast({
          style: Toast.Style.Success,
          title: `Chromium ${revision} installed`,
          message: appBundlePath,
        });
      } catch (error) {
        const toast = await initialToastPromise;
        toast?.hide();
        if (effectDisposed) {
          return;
        }
        // Only a real AbortedError counts as a cancellation. Checking the signal
        // as well would relabel a genuine failure as "cancelled" whenever the
        // user had already pressed cancel, hiding the error from them.
        const isAbort = error instanceof AbortedError;
        setPhase(isAbort ? "cancelled" : "failed");
        setErrorMessage(error instanceof Error ? error.message : String(error));
        setPriorBundleGone(error instanceof BundleRestoreError);
        setErrorKind(errorTitle(error));
        await showFailureToast(error, { title: errorTitle(error) });
      }
    };

    void run();

    return () => {
      effectDisposed = true;
      controller.abort();
    };
  }, [binaryPath, appBundlePath, handleProgress]);

  const handleCancel = useCallback(() => {
    // Only request the abort. The phase is set from the actual outcome, because
    // a cancel raised after the bundle swap cannot stop the install any more.
    abortRef.current?.abort();
  }, []);

  const handleCopyErrorDetails = useCallback(async () => {
    const stage = progress?.stage ?? "unknown";
    const body = [
      `Error: ${errorKind}`,
      `Stage: ${stage}`,
      `Target: ${appBundlePath}`,
      `Message: ${errorMessage ?? "unknown"}`,
    ].join("\n");
    await Clipboard.copy(body);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied error details",
    });
  }, [progress?.stage, errorMessage, errorKind, appBundlePath]);

  const handleClose = useCallback(async () => {
    await popToRoot();
  }, []);

  const markdown = renderMarkdown(
    appBundlePath,
    progress,
    downloadStats,
    phase,
    errorMessage,
    errorKind,
    priorBundleGone,
  );
  const navigationTitle = renderNavigationTitle(progress, phase);

  const revision = progress && "revision" in progress && progress.revision ? progress.revision : null;
  const showDownloadMeta = progress?.stage === "download";

  const metadata = (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Target" text={appBundlePath} />
      <Detail.Metadata.Label title="Source" text={SNAPSHOT_ORIGIN} />
      {revision ? <Detail.Metadata.Label title="Revision" text={revision} /> : null}
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Stage" text={progress ? STAGE_LABELS[progress.stage] : "Starting"} />
      {showDownloadMeta && progress.bytesTotal ? (
        <Detail.Metadata.Label
          title="Downloaded"
          text={`${formatMegabytes(progress.bytesDownloaded)} / ${formatMegabytes(progress.bytesTotal)} MB`}
        />
      ) : null}
      {showDownloadMeta && !progress.bytesTotal ? (
        <Detail.Metadata.Label title="Downloaded" text={`${formatMegabytes(progress.bytesDownloaded)} MB`} />
      ) : null}
      {showDownloadMeta && downloadStats && downloadStats.speedBytesPerSecond > 0 ? (
        <Detail.Metadata.Label title="Speed" text={`${formatMegabytes(downloadStats.speedBytesPerSecond)} MB/s`} />
      ) : null}
      {showDownloadMeta && downloadStats && downloadStats.etaSeconds !== null ? (
        <Detail.Metadata.Label title="ETA" text={formatEta(downloadStats.etaSeconds)} />
      ) : null}
      {phase === "failed" ? (
        <>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Error" text={errorKind} />
        </>
      ) : null}
    </Detail.Metadata>
  );

  return (
    <Detail
      markdown={markdown}
      navigationTitle={navigationTitle}
      metadata={metadata}
      actions={
        <ActionPanel>
          {phase === "running" ? (
            <Action
              title="Cancel"
              icon={Icon.Stop}
              // Common.Pin is also cmd+period, but this is the macOS cancel gesture, not a pin.
              // eslint-disable-next-line @raycast/prefer-common-shortcut
              shortcut={{ modifiers: ["cmd"], key: "." }}
              onAction={handleCancel}
            />
          ) : (
            <>
              {phase === "failed" ? (
                <Action
                  title="Copy Error Details"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  onAction={handleCopyErrorDetails}
                />
              ) : null}
              <Action
                title="Close"
                icon={Icon.XMarkCircle}
                // Common.Pin is also cmd+period, but this dismisses the view, it does not pin.
                // eslint-disable-next-line @raycast/prefer-common-shortcut
                shortcut={{ modifiers: ["cmd"], key: "." }}
                onAction={handleClose}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
