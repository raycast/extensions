import { useState, useEffect } from "react";
import { getApplications, Application } from "@raycast/api";

export function useBrowsers(initialBrowser = "com.google.Chrome") {
  const [browsers, setBrowsers] = useState<Application[]>([
    { name: "Google Chrome", bundleId: "com.google.Chrome", path: "" },
  ]);
  const [selectedBrowser, setSelectedBrowser] = useState<string>(initialBrowser);

  useEffect(() => {
    let updateBrowserList = true;

    (async () => {
      const installedApplications = await getApplications();

      const browserIds = [
        "com.google.Chrome",
        "com.apple.Safari",
        "com.brave.Browser",
        "org.mozilla.firefox",
        "com.microsoft.edgemac",
        "com.operasoftware.Opera",
        "org.chromium.Chromium",
        "com.vivaldi.Vivaldi",
        "company.thebrowser.Browser",
        "com.sigmaos.sigmaos.macos",
        "company.thebrowser.dia",
        "ai.perplexity.comet",
      ];

      const browsers = installedApplications.filter((app) => browserIds.includes(String(app.bundleId)));

      if (updateBrowserList) {
        setBrowsers(browsers);
      }
    })();

    return () => {
      updateBrowserList = false;
    };
  }, []);

  return { browsers, selectedBrowser, setSelectedBrowser };
}
