import { Detail, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { setAlternativeBrowserViaShortcut, setDefaultBrowserViaShortcut } from "../lib/shortcuts";
import { formatBrowserIdentifier, readVeljaConfig } from "../lib/velja";

export default function Command() {
  const [markdown, setMarkdown] = useState("# Quick Switch Browser\n\nSwapping default and alternative browsers...");

  useEffect(() => {
    async function run() {
      try {
        const config = readVeljaConfig();
        const currentDefault = config.defaultBrowser;
        const currentAlternative = config.alternativeBrowser;

        if (!currentDefault || !currentAlternative) {
          throw new Error("Both default and alternative browsers must be configured.");
        }

        setDefaultBrowserViaShortcut(currentAlternative);
        setAlternativeBrowserViaShortcut(currentDefault);

        setMarkdown(`# Quick Switch Browser

Swapped browsers successfully.

- **New Default:** ${formatBrowserIdentifier(currentAlternative)}
- **New Alternative:** ${formatBrowserIdentifier(currentDefault)}
`);
        await showToast({ style: Toast.Style.Success, title: "Swapped default and alternative browsers" });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setMarkdown(`# Quick Switch Browser

Could not switch browsers.

Error: ${message}`);
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not switch browsers",
          message,
        });
      }
    }

    run();
  }, []);

  return <Detail markdown={markdown} />;
}
