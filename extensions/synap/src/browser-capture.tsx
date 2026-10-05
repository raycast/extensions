import { BrowserExtension, Clipboard, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { CaptureFlow, type CaptureDraft } from "./components/capture-flow";
import { getConnection, type SynapConnection } from "./utils/preferences";

interface TabContent {
  title: string;
  url: string;
  bodyText?: string;
}

async function getActiveTab(): Promise<TabContent> {
  try {
    const tabs = await BrowserExtension.getTabs();
    const active = tabs.find((tab) => tab.active);
    if (active) {
      let bodyText: string | undefined;
      try {
        bodyText = await BrowserExtension.getContent({ format: "text" });
      } catch {
        // The page still has a useful title and URL.
      }
      return { title: active.title ?? active.url, url: active.url, bodyText: bodyText || undefined };
    }
  } catch {
    // Browser extension unavailable; a copied URL is a useful fallback.
  }

  const copied = await Clipboard.readText();
  if (copied?.startsWith("http://") || copied?.startsWith("https://")) {
    const parsed = new URL(copied);
    return { title: parsed.hostname, url: copied };
  }
  throw new Error("No browser tab found. Install the Raycast Browser Extension or copy a URL to the clipboard.");
}

export default function BrowserCapture() {
  const [connection, setConnection] = useState<SynapConnection | null | undefined>(undefined);
  const [draft, setDraft] = useState<CaptureDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const resolved = await getConnection();
      setConnection(resolved);
      if (!resolved) return;
      try {
        const tab = await getActiveTab();
        setDraft({
          text: [tab.title, tab.url, tab.bodyText ? `\n${tab.bodyText}` : ""].filter(Boolean).join("\n"),
          url: tab.url,
          sourceLabel: "Current browser page",
          placeholder: "Page title, URL, and selected text…",
        });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not read the active browser tab.");
      }
    })();
  }, []);

  if (connection === undefined) return <Detail isLoading markdown="" />;
  if (!connection)
    return <Detail markdown="# Connect Synap first\n\nRun **Connect to Synap Pod**, then capture this page." />;
  if (!draft && !error) return <Detail isLoading markdown="" />;
  if (error) return <Detail markdown={`# Could not read browser tab\n\n${error}`} />;
  return <CaptureFlow connection={connection} draft={draft!} />;
}
