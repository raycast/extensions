import { useEffect, useState } from "react";
import { BrowserExtension, Clipboard, Form, getPreferenceValues, getSelectedText, LaunchProps } from "@raycast/api";
import { isValidUrl } from "./utils.js";
import { DownloadForm } from "./views/download-form.js";

const { autoLoadUrlFromClipboard, autoLoadUrlFromSelectedText, enableBrowserExtensionSupport } =
  getPreferenceValues<ExtensionPreferences>();

export default function Command(props: LaunchProps) {
  const [loadedUrl, setLoadedUrl] = useState("");
  const [startupDone, setStartupDone] = useState(false);

  useEffect(() => {
    (async () => {
      let loaded = "";

      // A URL handed off from the Fast Download command takes priority.
      const contextUrl = (props.launchContext as { url?: string } | undefined)?.url;
      if (contextUrl && isValidUrl(contextUrl)) loaded = contextUrl;

      if (!loaded && autoLoadUrlFromClipboard) {
        const text = await Clipboard.readText();
        if (text && isValidUrl(text)) loaded = text;
      }
      if (!loaded && autoLoadUrlFromSelectedText) {
        try {
          const text = await getSelectedText();
          if (text && isValidUrl(text)) loaded = text;
        } catch {
          /* no selection */
        }
      }
      if (!loaded && enableBrowserExtensionSupport) {
        try {
          const tab = (await BrowserExtension.getTabs()).find((t) => t.active)?.url;
          if (tab && isValidUrl(tab)) loaded = tab;
        } catch {
          /* no browser extension */
        }
      }
      if (loaded) setLoadedUrl(loaded);
      setStartupDone(true);
    })();
  }, []);

  if (!startupDone) return <Form isLoading />;

  return <DownloadForm initialUrl={loadedUrl} />;
}
