import { BrowserExtension, environment } from "@raycast/api";
import { CaptureForm, Resolved } from "./lib/CaptureForm";
import { sanitizeName } from "./lib/save";

async function resolve(): Promise<Resolved> {
  // Extension not installed / API unavailable → fail loudly instead of silently.
  if (!environment.canAccess(BrowserExtension)) {
    throw new Error(
      "Raycast Browser Extension isn't available. Install it and open a supported browser tab.",
    );
  }

  let markdown: string;
  try {
    // Reader-mode Markdown straight from the active tab — no conversion needed.
    markdown = await BrowserExtension.getContent({ format: "markdown" });
  } catch {
    throw new Error(
      "Couldn't read a browser tab. Open a supported browser with the Raycast Browser Extension.",
    );
  }

  if (!markdown || markdown.trim().length === 0) {
    throw new Error("The current tab has no readable content.");
  }

  // Name from the active tab's title when available.
  let title = "";
  try {
    const tabs = await BrowserExtension.getTabs();
    title = tabs.find((t) => t.active)?.title ?? "";
  } catch {
    // getTabs is best-effort; fall back to a generic name below.
  }

  return {
    content: markdown,
    suggestedName: title ? sanitizeName(title) : "Untitled",
  };
}

export default function Command() {
  return <CaptureForm resolve={resolve} />;
}
