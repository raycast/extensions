import { useEffect, useState } from "react";
import { Action, ActionPanel, Clipboard, Detail, Icon, Toast, getPreferenceValues, useNavigation } from "@raycast/api";
import { execa } from "execa";

const { homebrewPath } = getPreferenceValues<ExtensionPreferences>();

export default function Updater() {
  const { pop } = useNavigation();
  const [versions, setVersions] = useState<Record<string, string>>({ "yt-dlp": "", ffmpeg: "" });
  const [outdated, setOutdated] = useState<Record<string, string>>({ "yt-dlp": "", ffmpeg: "" });
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
  const { stdout: infoOutput } = await execa(homebrewPath, ["info", "--json=v2", "yt-dlp", "ffmpeg"]);
  const info = JSON.parse(infoOutput) as { formulae: { name: string; versions: { stable: string } }[] };
  const versions = Object.fromEntries(info.formulae.map(({ name, versions }) => [name, versions.stable]));
  return versions;
}

async function getOutdated() {
  const { stdout: outdatedOutput } = await execa(homebrewPath, ["outdated", "--json=v2", "yt-dlp", "ffmpeg"]);
  const outdated = JSON.parse(outdatedOutput) as { formulae: { name: string; current_version: string }[] };
  const versions = Object.fromEntries(outdated.formulae.map(({ name, current_version }) => [name, current_version]));
  return versions;
}

async function upgrade() {
  return execa(homebrewPath, ["upgrade", "yt-dlp", "ffmpeg"]);
}

export async function checkUpToDate() {
  const versions = await getOutdated();
  const allUpToDate = Object.values(versions).every((version) => !version);
  return allUpToDate;
}
