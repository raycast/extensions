import { useState, useCallback } from "react";
import { Clipboard } from "@raycast/api";
import { useArticleReader } from "./hooks/useArticleReader";
import { ArticleReaderView } from "./views/ArticleReaderView";
import { isValidUrl } from "./utils/url-resolver";
import { urlLog } from "./utils/logger";

function extractUrlFromText(text: string): string | null {
  const urlPattern = /https?:\/\/[^\s]+/gi;
  const matches = text.match(urlPattern);

  if (!matches) return null;

  for (const match of matches) {
    const cleaned = match.replace(/[.,;!?)]+$/, "");
    if (isValidUrl(cleaned)) {
      return cleaned;
    }
  }

  return null;
}

async function resolveClipboardUrl(): Promise<{ url: string; source: string } | null> {
  urlLog.log("resolve:start", { source: "clipboard-command" });

  try {
    const clipboardText = await Clipboard.readText();
    if (clipboardText) {
      const trimmed = clipboardText.trim();
      if (isValidUrl(trimmed)) {
        urlLog.log("resolve:success", { source: "clipboard", url: trimmed });
        return { url: trimmed, source: "clipboard" };
      }

      const extracted = extractUrlFromText(trimmed);
      if (extracted) {
        urlLog.log("resolve:success", { source: "clipboard", url: extracted, extracted: true });
        return { url: extracted, source: "clipboard" };
      }
    }
    urlLog.log("resolve:skip", { source: "clipboard", reason: "not a valid URL" });
  } catch {
    urlLog.log("resolve:skip", { source: "clipboard", reason: "unable to read clipboard" });
  }

  urlLog.warn("resolve:failed", { reason: "no valid URL found in clipboard" });
  return null;
}

export default function Command() {
  const [showUrlForm, setShowUrlForm] = useState(false);
  const [invalidInput, setInvalidInput] = useState<string | null>(null);

  const handleNoUrl = useCallback(() => {
    setInvalidInput("No valid URL found in clipboard");
    setShowUrlForm(true);
  }, []);

  const reader = useArticleReader({
    resolveUrl: resolveClipboardUrl,
    onNoUrl: handleNoUrl,
    commandName: "open-clipboard",
  });

  const handleUrlFormSubmit = useCallback(
    async (url: string) => {
      setShowUrlForm(false);
      setInvalidInput(null);
      await reader.handleUrlSubmit(url);
    },
    [reader],
  );

  return (
    <ArticleReaderView
      {...reader}
      showUrlForm={showUrlForm}
      invalidInput={invalidInput}
      onUrlFormSubmit={handleUrlFormSubmit}
      onHideUrlForm={() => setShowUrlForm(false)}
    />
  );
}
