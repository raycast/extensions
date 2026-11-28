import { useEffect, useState } from "react";
import { BrowserExtension, Clipboard, Form, getPreferenceValues, getSelectedText, LaunchProps } from "@raycast/api";
import { isValidUrl } from "./utils.js";
import { DownloadForm } from "./views/download-form.js";

const { autoLoadUrlFromClipboard, autoLoadUrlFromSelectedText, enableBrowserExtensionSupport } =
  getPreferenceValues<Preferences.Index>();

export default function Command(props: LaunchProps) {
  const [loadedUrl, setLoadedUrl] = useState("");
  const [loadedClip, setLoadedClip] = useState("");
  const [startupDone, setStartupDone] = useState(false);

  useEffect(() => {
    (async () => {
      let loaded = "";

      // A URL handed off from the Fast Download command takes priority.
      const context = props.launchContext as { url?: string; clip?: unknown } | undefined;
      const contextUrl = context?.url;
      if (contextUrl && isValidUrl(contextUrl)) {
        loaded = contextUrl;
        // Chat About Link's "Download a Moment" hands over the part to download with the link.
        if (typeof context?.clip === "string") setLoadedClip(context.clip.slice(0, 40));
      }

      if (!loaded && autoLoadUrlFromClipboard) {
        try {
          // Trimmed: a copied link often ends with a space or a newline.
          const text = (await Clipboard.readText())?.trim();
          if (text && isValidUrl(text)) loaded = text;
        } catch {
          /* clipboard unavailable — the form opens empty */
        }
      }
      if (!loaded && autoLoadUrlFromSelectedText) {
        try {
          const text = (await getSelectedText()).trim();
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

  return <DownloadForm initialUrl={loadedUrl} initialClip={loadedClip} />;
}
