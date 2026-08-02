import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { isWebAppInstalled, isAutoPiPInstalled, createWebApp } from "./webapp";

type Status =
  "checking" | "not-installed" | "installing" | "installed" | "failed";

export default function SetupCommand() {
  const [webAppStatus, setWebAppStatus] = useState<Status>("checking");
  const [autoPiPStatus, setAutoPiPStatus] = useState<Status>("checking");

  async function checkAndInstall() {
    // Check web app
    const webAppInstalled = await isWebAppInstalled();
    if (webAppInstalled) {
      setWebAppStatus("installed");
    } else {
      setWebAppStatus("installing");
      try {
        await createWebApp();
        // Poll for installation — user may take time to click "Add" in Safari dialog
        let nowInstalled = false;
        for (let i = 0; i < 10; i++) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          nowInstalled = await isWebAppInstalled();
          if (nowInstalled) break;
        }
        setWebAppStatus(nowInstalled ? "installed" : "failed");
        if (nowInstalled) {
          await showToast({
            style: Toast.Style.Success,
            title: "Crunchyroll web app installed",
          });
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Web app installation failed",
            message: "Click 'Add to Dock' in the Safari dialog, then Recheck",
          });
        }
      } catch {
        setWebAppStatus("failed");
        await showToast({
          style: Toast.Style.Failure,
          title: "Web app installation failed",
          message: "Make sure Safari is running and try again",
        });
      }
    }

    // Check AutoPiP
    const autoPiPInstalled = await isAutoPiPInstalled();
    setAutoPiPStatus(autoPiPInstalled ? "installed" : "not-installed");
  }

  useEffect(() => {
    checkAndInstall();
  }, []);

  function statusIcon(status: Status): string {
    switch (status) {
      case "checking":
        return "⏳";
      case "not-installed":
        return "❌";
      case "installing":
        return "🔄";
      case "installed":
        return "✅";
      case "failed":
        return "⚠️";
    }
  }

  function statusText(status: Status): string {
    switch (status) {
      case "checking":
        return "Checking...";
      case "not-installed":
        return "Not installed";
      case "installing":
        return "Installing...";
      case "installed":
        return "Installed";
      case "failed":
        return "Failed — retry needed";
    }
  }

  const markdown = `
# Crunchyroll Setup

| Component | Status |
|-----------|--------|
| Safari Web App | ${statusIcon(webAppStatus)} ${statusText(webAppStatus)} |
| AutoPiP Extension | ${statusIcon(autoPiPStatus)} ${statusText(autoPiPStatus)} |

${
  webAppStatus === "installing"
    ? "### Installing Web App\n\nSafari is opening and adding Crunchyroll to your Dock. **Click 'Add'** when the dialog appears."
    : ""
}

${
  webAppStatus === "failed"
    ? "### Installation Failed\n\nClick **Retry Web App Install** below. Make sure Safari is running and click 'Add' in the dialog."
    : ""
}

${
  webAppStatus === "installed" && autoPiPStatus === "not-installed"
    ? "### Optional: AutoPiP\n\nAutoPiP enables automatic Picture-in-Picture for Crunchyroll videos. Install it from the App Store, then enable it in Safari → Settings → Extensions."
    : ""
}

${
  webAppStatus === "installed" && autoPiPStatus === "installed"
    ? "### All Set! 🎉\n\nEverything is configured. Use any Crunchyroll command in Raycast:\n- **Search Anime** — Search Crunchyroll\n- **Continue Watching** — Opens the web app\n- **Browse Trending** — See what's popular\n- **Browse History** — Quick access to recent anime"
    : ""
}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {webAppStatus === "failed" || webAppStatus === "not-installed" ? (
            <Action
              title="Retry Web App Install"
              icon={Icon.ArrowClockwise}
              onAction={async () => {
                setWebAppStatus("installing");
                try {
                  await createWebApp();
                  let nowInstalled = false;
                  for (let i = 0; i < 10; i++) {
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    nowInstalled = await isWebAppInstalled();
                    if (nowInstalled) break;
                  }
                  setWebAppStatus(nowInstalled ? "installed" : "failed");
                } catch {
                  setWebAppStatus("failed");
                }
              }}
            />
          ) : null}
          <Action
            title="Recheck Status"
            icon={Icon.ArrowClockwise}
            onAction={() => {
              setWebAppStatus("checking");
              setAutoPiPStatus("checking");
              checkAndInstall();
            }}
          />
          {autoPiPStatus === "not-installed" ? (
            <Action.OpenInBrowser
              title="Get AutoPiP from App Store"
              icon={Icon.AppWindow}
              url="https://apps.apple.com/app/autopip"
            />
          ) : null}
          <Action.OpenInBrowser
            title="Open Crunchyroll"
            url="https://www.crunchyroll.com"
          />
        </ActionPanel>
      }
    />
  );
}
