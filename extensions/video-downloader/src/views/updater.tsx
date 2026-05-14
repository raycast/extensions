import { useEffect, useState } from "react";
import { Action, ActionPanel, Clipboard, Detail, Icon, Toast, getPreferenceValues, useNavigation } from "@raycast/api";
import { execa } from "execa";
import { getWingetPath, isMac, isWindows } from "../utils.js";

const { homebrewPath } = getPreferenceValues<ExtensionPreferences>();

export default function Updater() {
  const { pop } = useNavigation();
  const [versions, setVersions] = useState<Record<string, string>>(
    isMac ? { "yt-dlp": "", ffmpeg: "" } : { "yt-dlp": "" },
  );
  const [outdated, setOutdated] = useState<Record<string, string>>(
    isMac ? { "yt-dlp": "", ffmpeg: "" } : { "yt-dlp": "" },
  );
  const [upgradingMessage, setUpgradingMessage] = useState<string>("");

  const allUpToDate = Object.values(outdated).every((version) => !version);

  useEffect(() => {
    if (upgradingMessage) return;
    const toast = new Toast({ style: Toast.Style.Animated, title: "Checking versions..." });
    toast.show();

    Promise.all([getVersions(), getOutdated()])
      .then(([versions, outdated]) => {
        toast.hide();
        setVersions(versions);
        setOutdated(outdated);
      })
      .catch((error) => {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to check versions";
        toast.message = errorMessage;
        if (error instanceof Error) {
          toast.primaryAction = {
            title: "Copy to Clipboard",
            onAction: () => {
              Clipboard.copy(errorMessage);
            },
          };
        }
      });
  }, [upgradingMessage]);

  return (
    <Detail
      markdown={[
        "## Versions",
        Object.entries(versions)
          .map(
            ([cli, version]) =>
              `${cli}: ${version === "" ? "Checking..." : version} ${outdated[cli] ? `(outdated: ${outdated[cli]})` : "(up to date)"}`,
          )
          .join("\n\n"),
        upgradingMessage,
      ]
        .filter((x) => Boolean(x))
        .join("\n\n")}
      actions={
        <ActionPanel>
          {allUpToDate ? undefined : (
            <Action
              icon={Icon.Download}
              title="Upgrade"
              onAction={async () => {
                const toast = new Toast({ style: Toast.Style.Animated, title: "Upgrading..." });
                toast.show();
                try {
                  setUpgradingMessage("Upgrading... Please do not close Raycast while the upgrade is in progress.");
                  await upgrade();
                  toast.hide();
                } catch (error) {
                  toast.style = Toast.Style.Failure;
                  toast.title = "Failed to upgrade";
                  toast.message = error instanceof Error ? error.message : "An unknown error occurred";
                  if (error instanceof Error) {
                    toast.primaryAction = {
                      title: "Copy to Clipboard",
                      onAction: () => {
                        Clipboard.copy(error.message);
                      },
                    };
                  }
                } finally {
                  setUpgradingMessage("");
                }
              }}
            />
          )}
          <Action icon={Icon.ArrowLeft} title="Back" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

async function getVersions() {
  if (isMac) {
    const { stdout: infoOutput } = await execa(homebrewPath, ["info", "--json=v2", "yt-dlp", "ffmpeg"]);
    const info = JSON.parse(infoOutput) as { formulae: { name: string; versions: { stable: string } }[] };
    const versions = Object.fromEntries(info.formulae.map(({ name, versions }) => [name, versions.stable]));
    return versions;
  } else if (isWindows) {
    const wingetPath = await getWingetPath();

    let ytdlpVersion = "";

    try {
      const { stdout: ytdlpOutput } = await execa(wingetPath, ["list", "--id", "yt-dlp.yt-dlp", "--exact"]);
      ytdlpVersion = parseWingetVersion(ytdlpOutput);
    } catch {
      // Ignore errors
    }

    return {
      "yt-dlp": ytdlpVersion,
    };
  }
  return { "yt-dlp": "" };
}

function parseWingetVersion(output: string): string {
  const lines = output.split("\n");
  for (const line of lines) {
    if (line.includes("yt-dlp")) {
      const versionMatch = line.match(/(\d+\.)+\d+/);
      if (versionMatch) {
        return versionMatch[0];
      }
    }
  }
  return "";
}

async function getOutdated() {
  if (isMac) {
    const { stdout: outdatedOutput } = await execa(homebrewPath, ["outdated", "--json=v2", "yt-dlp", "ffmpeg"]);
    const outdated = JSON.parse(outdatedOutput) as { formulae: { name: string; current_version: string }[] };
    const versions = Object.fromEntries(outdated.formulae.map(({ name, current_version }) => [name, current_version]));
    return versions;
  } else if (isWindows) {
    const wingetPath = await getWingetPath();

    try {
      const { stdout: upgradeOutput } = await execa(wingetPath, ["upgrade"]);
      const lines = upgradeOutput.split("\n");

      const outdatedVersions: Record<string, string> = {};

      for (const line of lines) {
        if (line.includes("yt-dlp.yt-dlp")) {
          const versionMatch = line.match(/(\d+\.)+\d+/g);
          if (versionMatch && versionMatch.length >= 2) {
            outdatedVersions["yt-dlp"] = versionMatch[1];
          }
        }
      }

      return outdatedVersions;
    } catch {
      return {};
    }
  }
  return {};
}

async function upgrade() {
  if (isMac) {
    return execa(homebrewPath, ["upgrade", "yt-dlp", "ffmpeg"]);
  } else if (isWindows) {
    const wingetPath = await getWingetPath();
    await execa(wingetPath, [
      "upgrade",
      "--id",
      "yt-dlp.yt-dlp",
      "--accept-source-agreements",
      "--accept-package-agreements",
    ]);
  }
}

export async function checkUpToDate() {
  const versions = await getOutdated();
  const allUpToDate = Object.values(versions).every((version) => !version);
  return allUpToDate;
}
