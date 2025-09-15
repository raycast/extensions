import { useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  Toast,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { ExecaError, execa } from "execa";
import { getWingetPath, homebrewPath, isMac, isWindows } from "../utils.js";

const macOSInstallGuide = (executable: string) => `
# 🚨 Error: \`${executable}\` is not installed
This extension depends on a command-line utility that is not detected on your system. You must install it continue.

If you have homebrew installed, simply press **⏎** to have this extension install it for you. Since \`${executable}\` is a heavy library, 
**it can take up to 2 minutes to install**.

**Please do not close Raycast while the installation is in progress.**

To install homebrew, visit [this link](https://brew.sh)
`;

const windowsInstallGuide = (executable: string) => `# 🚨 Error: \`${executable}\` is not installed

Please press **⏎** to have this extension install it for you. Since \`yt-dlp\` is a heavy library, **it can take up to 2 minutes to install**. \`yt-dlp\` includes \`ffmpeg\` and \`ffprobe\` binaries

## Windows Beta Manual Installation Guide

You can use the built-in Windows package manager, \`winget\`.

\`\`\`bash
winget install --id=yt-dlp.yt-dlp -e
\`\`\`
`;

export default function Installer({ executable, onRefresh }: { executable: string; onRefresh: () => void }) {
  return (
    <Detail
      actions={<AutoInstall onRefresh={onRefresh} />}
      markdown={isMac ? macOSInstallGuide(executable) : windowsInstallGuide(executable)}
    />
  );
}

function AutoInstall({ onRefresh }: { onRefresh: () => void }) {
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
              await execa(homebrewPath, ["install", "yt-dlp", "ffmpeg"]);
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
              await execa(wingetPath, ["install", "--id=yt-dlp.yt-dlp", "-e"]);
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
                  title: "yt-dlp is already installed",
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
