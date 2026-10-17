import { ReactNode, useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Icon,
  Toast,
  environment,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { ExecaError, execa } from "execa";
import { getHomebrewPath, getWingetPath, isMac, isWindows } from "../utils.js";
import {
  homebrewFormulaFor,
  isManagedTool,
  isWingetUpdateNotApplicable,
  toolInfoFor,
  wingetIdFor,
} from "../lib/tools.js";
import { downloadSpotdl, isAppleSilicon, isRosettaInstalled } from "../lib/managed-binary.js";
import { SPOTDL_SETUP_GUIDE_URL } from "../lib/docs.js";
import { resetWingetPackagesCache } from "../lib/binary.js";

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

const intro = (executable: string) => {
  const info = toolInfoFor(executable);
  return `# Install ${info.name}

The Downloader uses **${info.name}**${info.purpose ? `, which ${lowerFirst(info.purpose)}` : ""}. It isn't installed yet.`;
};

const macOSInstallGuide = (executable: string) => `${intro(executable)}

Press **↵** to install it with Homebrew. Bigger tools can take a couple of minutes, so keep Raycast open until it finishes.

---

**Prefer the terminal?**

\`\`\`bash
brew install ${homebrewFormulaFor(executable)}
\`\`\`

No Homebrew yet? Get it at [brew.sh](https://brew.sh).
`;

const windowsInstallGuide = (executable: string, wingetId: string) => `${intro(executable)}

Press **↵** to install it with winget. Bigger tools can take a couple of minutes, so keep Raycast open until it finishes.
${executable === "ffmpeg" || executable === "ffprobe" ? "\n_On Windows, `ffmpeg` and `ffprobe` come from yt-dlp's `yt-dlp.FFmpeg` package._\n" : ""}
---

**Prefer the terminal?**

\`\`\`bash
winget install --id=${wingetId} -e
\`\`\`
`;

const genericManagedInstallGuide = (executable: string) => `${intro(executable)}

The Downloader can download it for you: a one-time, self-contained binary (about 40 MB). No Homebrew or Python needed.

Press **↵** to download it now, and keep Raycast open until it finishes.
`;

const BUSY_NOTE = "> **Installing…** This can take a couple of minutes. Keep Raycast open until it finishes.\n\n";

const spotdlInstallGuide = (installed: boolean) => {
  const installBlock = installed
    ? "Set up your Spotify credentials below (about one minute), then press **⏎** to continue."
    : `This extension can download spotDL for you — a one-time, self-contained binary (~40 MB). No Python required.\n\nPress **⏎** to install. **Please do not close Raycast while the download is in progress.**${
        isMac
          ? `\n\n_Apple Silicon: the prebuilt binary is Intel-only and runs under Rosetta 2. If you prefer a native install, use the **Install via Homebrew** action — it installs the \`spotdl\` formula (Python-based, no Rosetta needed)._`
          : ""
      }`;
  return `
# ${installed ? "spotDL is installed" : "Install spotDL"}

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

function InstallerMetadata({ executable, installed }: { executable: string; installed: boolean }) {
  const info = toolInfoFor(executable);
  const managed = isManagedTool(executable);
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const hasSpotifyCredentials = Boolean(prefs.spotifyClientId?.trim() && prefs.spotifyClientSecret?.trim());
  return (
    <Detail.Metadata>
      <Detail.Metadata.Label title="Tool" text={info.name} icon={Icon.Terminal} />
      {info.purpose && <Detail.Metadata.Label title="Used For" text={info.purpose} />}
      <Detail.Metadata.TagList title="Status">
        <Detail.Metadata.TagList.Item
          text={installed ? "Installed" : "Not Installed"}
          color={installed ? Color.Green : Color.Orange}
        />
      </Detail.Metadata.TagList>
      <Detail.Metadata.Separator />
      <Detail.Metadata.Label title="Installs With" text={managed ? "Direct download" : isMac ? "Homebrew" : "winget"} />
      {!managed && (
        <Detail.Metadata.Label
          title="Package"
          text={isMac ? homebrewFormulaFor(executable) : wingetIdFor(executable)}
        />
      )}
      {executable === "spotdl" && (
        <Detail.Metadata.TagList title="Spotify Credentials">
          <Detail.Metadata.TagList.Item
            text={hasSpotifyCredentials ? "Set" : "Missing"}
            color={hasSpotifyCredentials ? Color.Green : Color.Orange}
          />
        </Detail.Metadata.TagList>
      )}
      {info.homepage && (
        <Detail.Metadata.Link title="Website" text={info.homepage.replace(/^https:\/\//, "")} target={info.homepage} />
      )}
    </Detail.Metadata>
  );
}

/**
 * Set-up screen for a missing tool. `alternatives` are actions to download as
 * another type whose tools are already installed, so a missing tool never
 * traps the user (e.g. no monolith, but Video would work).
 */
export default function Installer({
  executable,
  onRefresh,
  alternatives,
}: {
  executable: string;
  onRefresh: () => void;
  alternatives?: ReactNode;
}) {
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const note = busy ? BUSY_NOTE : "";
  if (isManagedTool(executable)) {
    return (
      <Detail
        isLoading={busy}
        actions={
          <ManagedInstall
            executable={executable}
            installed={installed}
            onInstalled={() => setInstalled(true)}
            onContinue={onRefresh}
            onBusyChange={setBusy}
          />
        }
        markdown={
          note + (executable === "spotdl" ? spotdlInstallGuide(installed) : genericManagedInstallGuide(executable))
        }
        metadata={<InstallerMetadata executable={executable} installed={installed} />}
      />
    );
  }
  return (
    <Detail
      isLoading={busy}
      actions={
        <AutoInstall executable={executable} onRefresh={onRefresh} onBusyChange={setBusy} alternatives={alternatives} />
      }
      markdown={
        note + (isMac ? macOSInstallGuide(executable) : windowsInstallGuide(executable, wingetIdFor(executable)))
      }
      metadata={<InstallerMetadata executable={executable} installed={false} />}
    />
  );
}

function ManagedInstall({
  executable,
  installed,
  onInstalled,
  onContinue,
  onBusyChange,
}: {
  executable: string;
  installed: boolean;
  onInstalled: () => void;
  onContinue: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [isLoading, setIsLoadingState] = useState(false);
  const setIsLoading = (value: boolean) => {
    setIsLoadingState(value);
    onBusyChange(value);
  };

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

function AutoInstall({
  executable,
  onRefresh,
  onBusyChange,
  alternatives,
}: {
  executable: string;
  onRefresh: () => void;
  onBusyChange: (busy: boolean) => void;
  alternatives?: ReactNode;
}) {
  const [isLoading, setIsLoadingState] = useState(false);
  const setIsLoading = (value: boolean) => {
    setIsLoadingState(value);
    onBusyChange(value);
  };

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
              await installationToast.hide();
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
            if (isLoading) return;

            setIsLoading(true);
            const installationToast = new Toast({ style: Toast.Style.Animated, title: "Installing..." });
            await installationToast.show();

            try {
              // Inside the try: getWingetPath throws when winget is missing,
              // and that must land in the error toast below — outside the try
              // it became an unhandled rejection and the user saw nothing.
              const wingetPath = await getWingetPath();
              await execa(wingetPath, [
                "install",
                "--accept-source-agreements",
                "--accept-package-agreements",
                `--id=${wingetIdFor(executable)}`,
                "-e",
              ]);
              await installationToast.hide();
              // Bust the winget Packages listing cache so the next
              // resolveBinary sees the just-installed package — without
              // this, a stale listing from before the install would still
              // report the binary as missing until extension reload.
              resetWingetPackagesCache();
              onRefresh();
            } catch (error) {
              await installationToast.hide();
              console.error(error);
              const isCommonError = error instanceof Error;
              const isExecaError = error instanceof ExecaError;
              const isENOENT = isExecaError && error.code === "ENOENT";

              if (isExecaError && isWingetUpdateNotApplicable(error.exitCode)) {
                await showToast({
                  style: Toast.Style.Success,
                  title: `${executable} is already installed`,
                  message: "If Raycast still can't find it, set the path in extension preferences.",
                  primaryAction: {
                    title: "Open Extension Preferences",
                    onAction: () => openExtensionPreferences(),
                  },
                });
                // "Already installed" can mean the package was installed
                // between the cache being built and this click; same
                // invalidation logic as the success branch above. Then
                // treat as a completed install and close the Installer
                // view so the user isn't stuck on it.
                resetWingetPackagesCache();
                onRefresh();
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
      {alternatives && <ActionPanel.Section title="Instead">{alternatives}</ActionPanel.Section>}
    </ActionPanel>
  );
}
