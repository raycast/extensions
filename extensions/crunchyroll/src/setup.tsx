import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  isWebAppInstalled,
  createWebApp,
  isAutoPiPInstalled,
  openCrunchyroll,
} from "./webapp";

export default function SetupCommand() {
  const [webAppInstalled, setWebAppInstalled] = useState<boolean | null>(null);
  const [autoPiPInstalled, setAutoPiPInstalled] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    async function check() {
      const webApp = await isWebAppInstalled();
      const autoPiP = await isAutoPiPInstalled();
      setWebAppInstalled(webApp);
      setAutoPiPInstalled(autoPiP);
    }
    check();
  }, []);

  const allReady = webAppInstalled === true && autoPiPInstalled === true;

  const markdown = `
# Crunchyroll Setup

## Status

${webAppInstalled === null ? "Checking..." : webAppInstalled ? "✅ **Crunchyroll Web App** — Installed" : "❌ **Crunchyroll Web App** — Not installed"}

${autoPiPInstalled === null ? "Checking..." : autoPiPInstalled ? "✅ **AutoPiP Extension** — Installed" : "❌ **AutoPiP Extension** — Not installed"}

---

## What This Extension Does

1. **Search anime** directly from Raycast — no browser needed
2. **Open Crunchyroll** in a fullscreen Safari web app (standalone window, not the full browser)
3. **Auto Picture-in-Picture** — when you swipe to another workspace, the video automatically pops out into a floating PiP window
4. **Remembers your progress** — the web app resumes your last watched episode

## Setup Steps

### 1. Crunchyroll Web App
${webAppInstalled ? "Already installed! 🎉" : "Click **Install Web App** below. This opens Crunchyroll in Safari and creates a standalone web app (Add to Dock)."}

### 2. AutoPiP Safari Extension
${autoPiPInstalled ? "Already installed! 🎉" : "Download AutoPiP from [GitHub](https://github.com/vordenken/AutoPiP/releases), install it, then enable it in Safari → Settings → Extensions."}

### 3. Grant Accessibility Permission
When you first use **Open Crunchyroll**, macOS may prompt you to grant Accessibility permission to the script. Approve it in **System Settings → Privacy & Security → Accessibility**.

---

${allReady ? "## ✅ All Ready!\n\nEverything is set up. Use **Search Anime** or **Open Crunchyroll** from Raycast." : "## ⏳ Setup Incomplete\n\nComplete the steps above to get the full experience."}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {!webAppInstalled && (
            <Action
              title="Install Web App"
              icon={Icon.Download}
              onAction={async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: "Creating web app...",
                  message: "Opening Crunchyroll in Safari",
                });
                try {
                  await createWebApp();
                  toast.style = Toast.Style.Success;
                  toast.title = "Web app created!";
                  toast.message = "Check your Applications folder";
                  setWebAppInstalled(true);
                } catch {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed to create web app";
                  toast.message = "Make sure Safari is not in fullscreen";
                }
              }}
            />
          )}
          <Action
            title="Open Crunchyroll"
            icon={Icon.Play}
            onAction={() => openCrunchyroll()}
          />
          {allReady && (
            <Action
              title="Search Anime"
              icon={Icon.MagnifyingGlass}
              onAction={() => {
                // The user can just search from Raycast root
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
