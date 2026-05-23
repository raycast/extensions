import { useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  Toast,
  environment,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { ExecaError, execa } from "execa";
import { getHomebrewPath, getWingetPath, isMac, isWindows } from "../utils.js";
import { homebrewFormulaFor, isManagedTool, wingetIdFor } from "../lib/tools.js";
import { downloadSpotdl, isAppleSilicon, isRosettaInstalled } from "../lib/managed-binary.js";

const macOSInstallGuide = (executable: string) => `
# 🚨 Error: \`${executable}\` is not installed
This extension depends on a command-line utility that is not detected on your system. You must install it continue.

If you have homebrew installed, simply press **⏎** to have this extension install it for you. Since \`${executable}\` is a heavy library,
**it can take up to 2 minutes to install**.

**Please do not close Raycast while the installation is in progress.**

To install homebrew, visit [this link](https://brew.sh)
`;

const windowsInstallGuide = (executable: string, wingetId: string) => `# 🚨 Error: \`${executable}\` is not installed

Please press **⏎** to have this extension install it for you. Since these are heavy libraries, **it can take up to 2 minutes to install**.
${executable === "ffmpeg" || executable === "ffprobe" ? "\n**Note:** `yt-dlp` bundles `ffmpeg` and `ffprobe` on Windows.\n" : ""}
## Windows Manual Installation Guide

You can use the built-in Windows package manager, \`winget\`.

\`\`\`bash
winget install --id=${wingetId} -e
\`\`\`
`;

const genericManagedInstallGuide = (executable: string) => `
# 🚨 Error: \`${executable}\` is not installed

This extension can download \`${executable}\` for you — a one-time, self-contained binary (~40 MB). No Homebrew or Python required.

Press **⏎** to download it now. **Please do not close Raycast while the download is in progress.**
`;

const SPOTDL_SETUP_GUIDE_URL = "https://github.com/sth3no/the-downloader/blob/main/SPOTIFY.md";

const spotdlInstallGuide = (installed: boolean) => {
  const installBlock = installed
    ? "Set up your Spotify credentials below (about one minute), then press **⏎** to continue."
    : `This extension can download spotDL for you — a one-time, self-contained binary (~40 MB). No Python required.\n\nPress **⏎** to install. **Please do not close Raycast while the download is in progress.**${
        isMac
          ? `\n\n_Apple Silicon: the prebuilt binary is Intel-only and runs under Rosetta 2. If you prefer a native install, use the **Install via Homebrew** action — it installs the \`spotdl\` formula (Python-based, no Rosetta needed)._`
          : ""
      }`;
  return `
# ${installed ? "✅ spotDL installed" : "🚨 spotDL is not installed"}

${installBlock}

---

## Connect your Spotify account

spotDL needs Spotify API credentials to look up track metadata. Without them, downloads fail with _"Could not get session auth tokens"_ — Spotify's anonymous flow is unreliable. The one-time setup takes about a minute:

1. Go to https://developer.spotify.com/dashboard and log in with any Spotify account.
2. Click **Create app**. Use any name and description. For **Redirect URI**, enter \`http://127.0.0.1:9900/\` (this is the address spotDL opens during user-auth; for public-only downloads any value works, but matching this default lets you flip on private-playlist support later). Tick **Web API**. Save.
3. Open your new app, then **Settings**. Copy the **Client ID**. Click **View client secret** and copy the **Client Secret**.
4. Open this extension's preferences (⌘,) and paste them into **Spotify: Client ID** and **Spotify: Client Secret**.
5. Come back here and ${installed ? "press **⏎** to continue" : "try the download again"}.

Once entered, your credentials persist — you only do this once.

Something not working? Open the [setup guide & troubleshooting](${SPOTDL_SETUP_GUIDE_URL}).
`;
};

export default function Installer({ executable, onRefresh }: { executable: string; onRefresh: () => void }) {
  const [installed, setInstalled] = useState(false);
  if (isManagedTool(executable)) {
    return (
      <Detail
        actions={
          <ManagedInstall
            executable={executable}
            installed={installed}
            onInstalled={() => setInstalled(true)}
            onContinue={onRefresh}
          />
        }
        markdown={executable === "spotdl" ? spotdlInstallGuide(installed) : genericManagedInstallGuide(executable)}
      />
    );
  }
  return (
    <Detail
      actions={<AutoInstall executable={executable} onRefresh={onRefresh} />}
      markdown={isMac ? macOSInstallGuide(executable) : windowsInstallGuide(executable, wingetIdFor(executable))}
    />
  );
}

function ManagedInstall({
  executable,
  installed,
  onInstalled,
  onContinue,
}: {
  executable: string;
  installed: boolean;
  onInstalled: () => void;
  onContinue: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const setupGuideAction = (
    <Action title="Open Setup Guide" icon={Icon.QuestionMarkCircle} onAction={() => open(SPOTDL_SETUP_GUIDE_URL)} />
  );

  if (installed) {
    return (
      <ActionPanel>
        <Action title="Continue" icon={Icon.ArrowRight} onAction={onContinue} />
        <Action title="Open Extension Preferences" icon={Icon.Cog} onAction={openExtensionPreferences} />
        {executable === "spotdl" && setupGuideAction}
      </ActionPanel>
    );
  }

  const installViaBrew = async () => {
    if (isLoading) return;
    setIsLoading(true);
    const installationToast = new Toast({ style: Toast.Style.Animated, title: "Installing spotdl via Homebrew..." });
    await installationToast.show();
    try {
      await execa(getHomebrewPath(), ["install", "spotdl"]);
      await installationToast.hide();
      setIsLoading(false);
      if (executable === "spotdl") {
        onInstalled();
      } else {
        onContinue();
      }
    } catch (error) {
      await installationToast.hide();
      console.error(error);
      const isExecaError = error instanceof ExecaError;
      const isENOENT = isExecaError && error.code === "ENOENT";
      const message = error instanceof Error ? error.message : "An unknown error occurred";
      await showToast({
        style: Toast.Style.Failure,
        title: isENOENT ? "Cannot find Homebrew" : "Homebrew Install Failed",
        message: isENOENT
          ? "Please make sure your `brew` PATH is configured correctly in extension preferences. If you don't have Homebrew installed, you can download it from https://brew.sh."
          : message,
        primaryAction: {
          title: isENOENT ? "Open Extension Preferences" : "Copy to Clipboard",
          onAction: () => {
            if (isENOENT) openExtensionPreferences();
            else Clipboard.copy(message);
          },
        },
      });
      setIsLoading(false);
    }
  };

  return (
    <ActionPanel>
      {!isLoading && (
        <Action
          title={`Download ${executable}`}
          icon={Icon.Download}
          onAction={async () => {
            if (isLoading) return;

            setIsLoading(true);
            const installationToast = new Toast({ style: Toast.Style.Animated, title: `Downloading ${executable}...` });
            await installationToast.show();

            try {
              await downloadSpotdl(environment.supportPath);
              await installationToast.hide();
              setIsLoading(false);
              if (executable === "spotdl") {
                onInstalled();
              } else {
                onContinue();
              }
              return;
            } catch (error) {
              await installationToast.hide();
              console.error(error);
              const needsRosetta = isAppleSilicon() && !isRosettaInstalled();
              const message = error instanceof Error ? error.message : "An unknown error occurred";
              await showToast({
                style: Toast.Style.Failure,
                title: needsRosetta ? "spotDL needs Rosetta 2" : "Download Failed",
                message,
                primaryAction: {
                  title: "Copy to Clipboard",
                  onAction: () => {
                    Clipboard.copy(message);
                  },
                },
              });
            }
            setIsLoading(false);
          }}
        />
      )}
      {!isLoading && isMac && executable === "spotdl" && (
        <Action title="Install Via Homebrew" icon={Icon.Download} onAction={installViaBrew} />
      )}
      {!isLoading && executable === "spotdl" && setupGuideAction}
    </ActionPanel>
  );
}

function AutoInstall({ executable, onRefresh }: { executable: string; onRefresh: () => void }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <ActionPanel>
      {!isLoading && isMac && (
        <Action
          title="Install with Homebrew"
          icon={Icon.Download}
          onAction={async () => {
            if (isLoading) return;

            setIsLoading(true);
            const installationToast = new Toast({ style: Toast.Style.Animated, title: "Installing..." });
            await installationToast.show();

            try {
              await execa(getHomebrewPath(), ["install", homebrewFormulaFor(executable)]);
              await installationToast.hide();
              onRefresh();
            } catch (error) {
              installationToast.hide();
              console.error(error);
              const isCommonError = error instanceof Error;
              const isExecaError = error instanceof ExecaError;
              const isENOENT = isExecaError && error.code === "ENOENT";

              await showToast({
                style: Toast.Style.Failure,
                title: isCommonError ? (isENOENT ? "Cannot find Homebrew" : error.name) : "Installation Failed",
                message: isCommonError
                  ? isENOENT
                    ? "Please make sure your `brew` PATH is configured correctly in extension preferences. If you don't have Homebrew installed, you can download it from https://brew.sh."
                    : error.message
                  : "An unknown error occurred while trying to install",
                primaryAction: {
                  title: isENOENT ? "Open Extension Preferences" : "Copy to Clipboard",
                  onAction: () => {
                    if (isENOENT) {
                      openExtensionPreferences();
                    } else {
                      Clipboard.copy(
                        isCommonError ? error.message : "An unknown error occurred while trying to install",
                      );
                    }
                  },
                },
                secondaryAction: isENOENT
                  ? {
                      title: "Open Installation Guide in Browser",
                      onAction: () => {
                        open("https://brew.sh");
                      },
                    }
                  : undefined,
              });
            }
            setIsLoading(false);
          }}
        />
      )}
      {!isLoading && isWindows && (
        <Action
          title="Install with Winget"
          icon={Icon.Download}
          onAction={async () => {
            const wingetPath = await getWingetPath();
            if (isLoading) return;

            setIsLoading(true);
            const installationToast = new Toast({ style: Toast.Style.Animated, title: "Installing..." });
            await installationToast.show();

            try {
              await execa(wingetPath, [
                "install",
                "--accept-source-agreements",
                "--accept-package-agreements",
                `--id=${wingetIdFor(executable)}`,
                "-e",
              ]);
              await installationToast.hide();
              onRefresh();
            } catch (error) {
              installationToast.hide();
              console.error(error);
              const isCommonError = error instanceof Error;
              const isExecaError = error instanceof ExecaError;
              const isENOENT = isExecaError && error.code === "ENOENT";

              if (isExecaError && error.exitCode === 2316632107) {
                await showToast({
                  style: Toast.Style.Success,
                  title: `${executable} is already installed`,
                  message: "Please configure the path in extension preferences",
                });
              } else {
                await showToast({
                  style: Toast.Style.Failure,
                  title: isCommonError ? (isENOENT ? "Cannot find Winget" : error.name) : "Installation Failed",
                  message: isCommonError
                    ? isENOENT
                      ? "Please make sure your `winget` PATH is configured correctly in extension preferences. If you don't have Winget installed, you can download it from https://winget.run."
                      : error.message
                    : "An unknown error occurred while trying to install",
                  primaryAction: {
                    title: isENOENT ? "Open Extension Preferences" : "Copy to Clipboard",
                    onAction: () => {
                      if (isENOENT) {
                        openExtensionPreferences();
                      } else {
                        Clipboard.copy(
                          isCommonError ? error.message : "An unknown error occurred while trying to install",
                        );
                      }
                    },
                  },
                  secondaryAction: isENOENT
                    ? {
                        title: "Open Installation Guide in Browser",
                        onAction: () => {
                          open("https://winget.run");
                        },
                      }
                    : undefined,
                });
              }
            }
            setIsLoading(false);
          }}
        />
      )}
    </ActionPanel>
  );
}
