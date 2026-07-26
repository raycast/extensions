import { Clipboard, Toast, showHUD, showToast } from "@raycast/api";
import { basename } from "node:path";
import { convertWebpageToMarkdown } from "./convert";
import { saveMarkdownToFile } from "./save";
import type { CommandPreferences } from "./types";

export type ConversionDestination = "file" | "clipboard";

export async function runConversionToHud(options: {
  url: string;
  /** Rendered HTML from the browser extension, when converting a tab. */
  html?: string;
  destination: ConversionDestination;
  preferences: CommandPreferences;
}): Promise<void> {
  const { url, html, destination, preferences } = options;
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: html ? "Reading page…" : "Fetching page…",
  });

  try {
    const result = await convertWebpageToMarkdown({
      url,
      html,
      preferences,
      onProgress: (message) => {
        toast.title = message;
      },
    });

    if (destination === "file") {
      toast.title = "Saving file…";
      const outputPath = await saveMarkdownToFile({
        title: result.title,
        markdown: result.markdown,
        url: result.url,
        preferences,
      });
      await toast.hide();
      await showHUD(`🟢 Saved — ${basename(outputPath)}`);
    } else {
      await Clipboard.copy(result.markdown);
      await toast.hide();
      await showHUD(`🟢 Copied — ${result.title ?? "markdown"}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Without this the failure never shows up in `ray develop` logs.
    console.error("[web-to-md] conversion failed:", err);

    toast.style = Toast.Style.Failure;
    toast.title = "Conversion failed";
    toast.message = message;
    toast.primaryAction = {
      title: "Copy Error",
      onAction: () => Clipboard.copy(message),
    };
  }
}
