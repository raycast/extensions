import { useState, useCallback } from "react";
import { Clipboard } from "@raycast/api";
import { useArticleReader } from "./hooks/useArticleReader";
import { ArticleReaderView } from "./views/ArticleReaderView";
import { findUrl } from "./utils/url-resolver";
import { withTimeout } from "./utils/host-api";
import { urlLog } from "./utils/logger";

async function resolveClipboardUrl(): Promise<{ url: string; source: string } | null> {
  urlLog.log("resolve:start", { source: "clipboard-command" });

  const clipboardText = await withTimeout(() => Clipboard.readText(), undefined, undefined, "readText");

  if (clipboardText) {
    const found = findUrl(clipboardText);
    if (found) {
      urlLog.log("resolve:success", { source: "clipboard", url: found.url, extracted: found.extracted });
      return { url: found.url, source: "clipboard" };
    }
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
