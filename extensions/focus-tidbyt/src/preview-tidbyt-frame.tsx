import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Toast,
  closeMainWindow,
  environment,
  showToast,
} from "@raycast/api";
import { execFile } from "child_process";
import { promises as fs } from "fs";
import { promisify } from "util";
import os from "os";
import path from "path";
import { useState } from "react";
import { openUrlInDefaultBrowser, toFileUrl } from "./lib/browser";
import { toErrorMessage } from "./lib/errors";
import { startPreviewAutoRefresh } from "./lib/preview";
import { getPreferences } from "./lib/preferences";
import { parseIntervalMs } from "./lib/interval";

const execFileAsync = promisify(execFile);

type FormValues = {
  minutes: string;
};

export default function Command() {
  const [errorState, setErrorState] = useState<{
    message: string;
    logPath: string;
  } | null>(null);
  if (errorState) {
    return (
      <Detail
        navigationTitle="Preview Tidbyt Frame"
        markdown={`# Preview Failed\n\n\`\`\`\n${errorState.message}\n\`\`\``}
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
      navigationTitle="Preview Tidbyt Frame"
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues>
            title="Render Preview"
            onSubmit={(values) => handleSubmit(values, setErrorState)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="minutes"
        title="Remaining Minutes"
        placeholder="25"
        defaultValue="25"
      />
    </Form>
  );
}

async function handleSubmit(
  values: FormValues,
  setErrorState: (state: { message: string; logPath: string }) => void
) {
  const minutes = Number(values.minutes);
  if (!Number.isFinite(minutes) || minutes < 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid minutes",
      message: "Enter a number of minutes (0 or greater).",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Rendering preview",
  });
  try {
    const htmlPath = path.join(
      os.tmpdir(),
      "raycast-focus-tidbyt-preview.html"
    );
    const roundedMinutes = Math.round(minutes);
    const startEpochMs = Date.now();
    const endEpochMs = startEpochMs + roundedMinutes * 60_000;
    const refreshMs = parseIntervalMs(getPreferences().updateInterval);
    await startPreviewAutoRefresh({
      previewPath: htmlPath,
      startEpochMs,
      endEpochMs,
      refreshMs,
    });
    await openUrlInDefaultBrowser(toFileUrl(htmlPath));
    toast.style = Toast.Style.Success;
    toast.title = "Preview opened";
    await closeMainWindow();
  } catch (error) {
    console.error(error);
    const errorText = formatError(error);
    const logPath = await writeErrorLog(errorText);
    setErrorState({ message: errorText, logPath });
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to render preview";
    toast.message = "See the error details.";
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return toErrorMessage(error);
}

async function writeErrorLog(message: string): Promise<string> {
  const dir = environment.supportPath;
  await fs.mkdir(dir, { recursive: true });
  const logPath = path.join(dir, "preview-error.log");
  const timestamp = new Date().toISOString();
  await fs.writeFile(logPath, `[${timestamp}]\\n${message}\\n`, {
    encoding: "utf8",
  });
  return logPath;
}

async function openFile(filePath: string) {
  await execFileAsync("/usr/bin/open", [filePath]);
}
