import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import fs from "fs/promises";
import path from "path";
import { useEffect, useState } from "react";
import { pollJob, startTranslation } from "./lib/noll-api";
import { getAccessToken } from "./lib/oauth";

type State =
  | { type: "loading" }
  | { type: "authenticating" }
  | { type: "uploading" }
  | { type: "translating"; progress: number }
  | { type: "ready"; imageBase64: string; mimeType: string }
  | { type: "error"; message: string };

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60; // 120 seconds max (60 * 2 seconds)

export default function TranslateClipboard() {
  const [state, setState] = useState<State>({ type: "loading" });
  const { defaultLanguage } = getPreferenceValues<Preferences.TranslateClipboard>();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        // 1. Authenticate first
        setState({ type: "authenticating" });
        const token = await getAccessToken();

        if (cancelled) return;

        if (!token) {
          setState({
            type: "error",
            message: "Authentication failed - no token received",
          });
          return;
        }

        // 2. Read clipboard
        const { file } = await Clipboard.read();
        if (!file?.startsWith("file://")) {
          setState({
            type: "error",
            message: "No image in clipboard!\n\nTake a screenshot with **Cmd+Shift+4**",
          });
          return;
        }

        // 3. Read image file
        const imagePath = decodeURI(file.substring(7));
        const imageBuffer = await fs.readFile(imagePath);
        let filename = path.basename(imagePath);
        const ext = path.extname(imagePath).toLowerCase();
        const mimeType =
          ext === ".png"
            ? "image/png"
            : ext === ".jpg" || ext === ".jpeg"
              ? "image/jpeg"
              : "image/png";

        // Ensure filename has an extension (macOS clipboard sometimes omits it)
        if (!ext) {
          filename = `${filename}.png`;
        }

        // 4. Start translation
        setState({ type: "uploading" });
        const { jobId, providerJobId } = await startTranslation(
          token,
          imageBuffer,
          defaultLanguage,
          filename,
        );

        if (cancelled) return;

        // 5. Poll for completion
        setState({ type: "translating", progress: 0 });

        let attempts = 0;
        while (!cancelled && attempts < MAX_POLL_ATTEMPTS) {
          const job = await pollJob(token, jobId, providerJobId, defaultLanguage);

          if (job.status === "ready" && job.result?.image) {
            setState({
              type: "ready",
              imageBase64: job.result.image,
              mimeType,
            });
            await showToast({
              style: Toast.Style.Success,
              title: "Translation complete!",
            });
            return;
          }

          if (job.status === "failed") {
            setState({
              type: "error",
              message: job.error || "Translation failed",
            });
            return;
          }

          setState({ type: "translating", progress: job.progress || 0 });
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          attempts++;
        }

        if (attempts >= MAX_POLL_ATTEMPTS) {
          setState({
            type: "error",
            message: "Translation timed out. Please try again.",
          });
        }
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : "Unknown error";
        setState({ type: "error", message });
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message,
        });
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [defaultLanguage]);

  // Render based on state
  if (state.type === "error") {
    return <Detail markdown={`## Error\n\n${state.message}`} />;
  }

  if (state.type === "loading") {
    return <Detail isLoading markdown="Starting..." />;
  }

  if (state.type === "authenticating") {
    return <Detail isLoading markdown="Signing in to Noll..." />;
  }

  if (state.type === "uploading") {
    return <Detail isLoading markdown="Uploading image..." />;
  }

  if (state.type === "translating") {
    const filled = Math.floor(state.progress / 5);
    const empty = 20 - filled;
    const progressBar =
      state.progress > 0 ? `\n\n${"█".repeat(filled)}${"░".repeat(empty)} ${state.progress}%` : "";
    return <Detail isLoading markdown={`Translating...${progressBar}`} />;
  }

  // Ready - show translated image
  const imageMarkdown = `![Translated Image](data:${state.mimeType};base64,${state.imageBase64})`;

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action
            onAction={async () => {
              // Write base64 to temp file, copy, then clean up
              const tempPath = `/tmp/noll-translated.png`;
              const buffer = Buffer.from(state.imageBase64, "base64");
              await fs.writeFile(tempPath, buffer);
              await Clipboard.copy({ file: tempPath });
              await fs.unlink(tempPath).catch(() => {});
              await showToast({
                style: Toast.Style.Success,
                title: "Image copied to clipboard!",
              });
            }}
            shortcut={{ modifiers: [], key: "return" }}
            title="Copy Image to Clipboard"
          />
        </ActionPanel>
      }
      markdown={imageMarkdown}
    />
  );
}
