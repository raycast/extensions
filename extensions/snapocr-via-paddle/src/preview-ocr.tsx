import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { recognizeText } from "./api";
import { ScreenshotCancelledError, takeScreenshot } from "./screenshot";
import { cleanupScreenshot, postProcessText } from "./utils";

export default function Command() {
  const [text, setText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      let screenshotPath: string;
      try {
        screenshotPath = await takeScreenshot();
      } catch (error) {
        if (error instanceof ScreenshotCancelledError) {
          if (!cancelled) setIsLoading(false);
          return;
        }
        await showToast({ style: Toast.Style.Failure, title: "Screenshot failed", message: String(error) });
        if (!cancelled) setIsLoading(false);
        return;
      }

      try {
        const result = await recognizeText(screenshotPath);
        const processed = postProcessText(result.text);

        if (cancelled) return;

        if (!processed) {
          await showToast({ style: Toast.Style.Failure, title: "No text detected" });
        } else {
          setText(processed);
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Recognition failed",
          message: error instanceof Error ? error.message : String(error),
        });
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

  const markdown = text ? `## Recognized Text\n\n${text}` : "No text recognized. Take a screenshot to start.";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        text ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Text" content={text} />
            <Action.Paste title="Paste Text" content={text} />
            <Action.CopyToClipboard title="Copy as Markdown" content={`\`\`\`\n${text}\n\`\`\``} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
