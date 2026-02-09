import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  Icon,
  Toast,
  closeMainWindow,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { execFile } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { useState } from "react";
import { promisify } from "util";
import { getPreferences } from "./lib/preferences";
import { runShortcut } from "./lib/shortcuts";
import { saveSession } from "./lib/session";
import { pushIfNeeded } from "./lib/update";
import { toErrorMessage } from "./lib/errors";
import { openUrlInDefaultBrowser, toFileUrl } from "./lib/browser";
import { startPreviewAutoRefresh } from "./lib/preview";
import { parseIntervalMs } from "./lib/interval";
import {
  getMissingConfigMessage,
  getPushProviderLabel,
  hasPushConfig,
} from "./lib/push-provider";

type FormValues = {
  durationMinutes: string;
  title: string;
};

const execFileAsync = promisify(execFile);

export default function Command() {
  const [errorState, setErrorState] = useState<{
    message: string;
    logPath: string;
  } | null>(null);
  if (errorState) {
    return (
      <Detail
        navigationTitle="Start Focus + Tidbyt"
        markdown={`# Start Failed\n\n\`\`\`\n${errorState.message}\n\`\`\``}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Error"
              content={errorState.message}
            />
            <Action
              title="Open Error Log"
              icon={Icon.Document}
              onAction={() => openFile(errorState.logPath)}
            />
          </ActionPanel>
        }
      />
    );
  }
  return (
    <Form
      navigationTitle="Start Focus + Tidbyt"
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            title="Start Focus"
            onSubmit={(values) => handleSubmit(values, setErrorState)}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="durationMinutes"
        title="Duration (minutes)"
        placeholder="25"
        defaultValue="25"
      />
      <Form.TextField
        id="title"
        title="Title (optional)"
        placeholder="Deep Work"
      />
    </Form>
  );
}

async function handleSubmit(
  values: FormValues,
  setErrorState: (state: { message: string; logPath: string }) => void
) {
  const durationMinutes = Number(values.durationMinutes);
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid duration",
      message: "Enter a number of minutes greater than 0.",
    });
    return;
  }

  const prefs = getPreferences();
  const title = values.title?.trim() || "";
  const safeTitle = title.replaceAll("|", "/");
  const durationSec = Math.round(durationMinutes * 60);
  const startEpochMs = Date.now();
  const endEpochMs = startEpochMs + durationSec * 1000;
  const installationId = prefs.installationId?.trim() || "raycast-focus";
  const providerLabel = getPushProviderLabel(prefs);
  const hasProviderConfig = hasPushConfig(prefs);
  const missingConfigMessage = getMissingConfigMessage(prefs);

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Starting Focus session",
  });

  try {
    const shortcutInput = `${durationMinutes}|${safeTitle}`;
    await runShortcut(
      prefs.startShortcutName ?? "Raycast Focus - Start",
      shortcutInput
    );
  } catch (error) {
    const errorText = formatError(error);
    const logPath = await writeErrorLog(errorText);
    setErrorState({ message: errorText, logPath });
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to start Focus";
    toast.message = "See error details.";
    return;
  }

  await saveSession({
    startEpochMs,
    endEpochMs,
    durationSec,
    title: safeTitle || undefined,
    installationId,
  });

  if (!hasProviderConfig) {
    await openPreview(
      startEpochMs,
      endEpochMs,
      parseIntervalMs(prefs.updateInterval),
      safeTitle || undefined
    );
    toast.style = Toast.Style.Success;
    toast.title = "Focus started (Preview opened)";
    toast.message = missingConfigMessage;
    await closeMainWindow();
    return;
  }

  try {
    await pushIfNeeded(prefs, { force: true });
  } catch (error) {
    await Clipboard.copy(formatError(error));
    await openPreview(
      startEpochMs,
      endEpochMs,
      parseIntervalMs(prefs.updateInterval),
      safeTitle || undefined
    );
    toast.style = Toast.Style.Success;
    toast.title = "Focus started (Preview opened)";
    toast.message = `${providerLabel} unavailable (error copied to clipboard).`;
    await closeMainWindow();
    return;
  }

  toast.style = Toast.Style.Success;
  toast.title = "Focus started";
  await closeMainWindow();
}

async function openPreview(
  startEpochMs: number,
  endEpochMs: number,
  refreshMs: number,
  title?: string
) {
  const previewPath = path.join(
    os.tmpdir(),
    "raycast-focus-tidbyt-preview.html"
  );
  await startPreviewAutoRefresh({
    previewPath,
    startEpochMs,
    endEpochMs,
    title,
    refreshMs,
  });
  await openUrlInDefaultBrowser(toFileUrl(previewPath));
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return toErrorMessage(error);
}

async function writeErrorLog(message: string): Promise<string> {
  const logPath = path.join(
    os.tmpdir(),
    "raycast-focus-tidbyt-start-error.log"
  );
  const timestamp = new Date().toISOString();
  await fs.writeFile(logPath, `[${timestamp}]\n${message}\n`, {
    encoding: "utf8",
  });
  return logPath;
}

async function openFile(filePath: string) {
  await execFileAsync("/usr/bin/open", [filePath]);
}
