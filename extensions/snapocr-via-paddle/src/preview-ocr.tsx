import { Action, ActionPanel, Detail, Toast, showInFinder, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { recognizeText } from "./api";
import { exportMarkdownBundle } from "./export-markdown";
import { ScreenshotCancelledError, takeScreenshot } from "./screenshot";
import { cleanupScreenshot, postProcessText } from "./utils";
import type { OCRResult } from "./types";

type ViewState = "capturing" | "recognizing" | "ready" | "empty" | "error" | "cancelled";

export default function Command() {
  const [text, setText] = useState<string>("");
  const [result, setResult] = useState<OCRResult | null>(null);
  const [sourcePath, setSourcePath] = useState<string>("");
  const [viewState, setViewState] = useState<ViewState>("capturing");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      let screenshotPath: string;
      try {
        screenshotPath = await takeScreenshot();
      } catch (error) {
        if (error instanceof ScreenshotCancelledError) {
          if (!cancelled) {
            setViewState("cancelled");
            setStatusMessage("Screenshot cancelled. Run the command again when you want to capture a document.");
            setIsLoading(false);
          }
          return;
        }
        await showToast({ style: Toast.Style.Failure, title: "Screenshot failed", message: String(error) });
        if (!cancelled) {
          setViewState("error");
          setStatusMessage(error instanceof Error ? error.message : String(error));
          setIsLoading(false);
        }
        return;
      }

      try {
        if (!cancelled) {
          setViewState("recognizing");
          setStatusMessage("Sending the screenshot to Baidu AIStudio for layout-aware OCR...");
        }

        const result = await recognizeText(screenshotPath);
        const processed = postProcessText(result.text);

        if (cancelled) return;

        if (!processed) {
          await showToast({ style: Toast.Style.Failure, title: "No text detected" });
          setViewState("empty");
          setStatusMessage("No readable text was detected in this screenshot. Try a clearer crop or a different page.");
        } else {
          setText(processed);
          setResult(result);
          setSourcePath(screenshotPath);
          setViewState("ready");
          setStatusMessage("");
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Recognition failed",
          message: error instanceof Error ? error.message : String(error),
        });
        if (!cancelled) {
          setViewState("error");
          setStatusMessage(error instanceof Error ? error.message : String(error));
        }
      } finally {
        await cleanupScreenshot(screenshotPath);
        if (!cancelled) setIsLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleExport() {
    if (!result || !sourcePath || isExporting) {
      return;
    }

    setIsExporting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Exporting Markdown bundle..." });

    try {
      const exported = await exportMarkdownBundle(result, sourcePath);
      toast.style = Toast.Style.Success;
      toast.title = "Markdown bundle exported";
      toast.message = exported.markdownPath;
      await showInFinder(exported.bundlePath);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Export failed";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsExporting(false);
    }
  }

  const markdown =
    viewState === "ready"
      ? `## Recognized Text\n\n${text}`
      : viewState === "recognizing"
        ? "## Recognizing Screenshot\n\nSending the screenshot to Baidu AIStudio and reconstructing the page structure..."
        : viewState === "empty"
          ? `## No Text Detected\n\n${statusMessage}`
          : viewState === "error"
            ? `## Recognition Failed\n\n${statusMessage}`
            : viewState === "cancelled"
              ? `## Screenshot Cancelled\n\n${statusMessage}`
              : "## Capture a Screenshot\n\nSelect the part of the screen you want to turn into structured Markdown.";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        text ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Text" content={text} />
            <Action.Paste title="Paste Text" content={text} />
            <Action title="Export Markdown Bundle" onAction={handleExport} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
