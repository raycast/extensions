import { Action, ActionPanel, Detail, Icon, Image, List, openExtensionPreferences } from "@raycast/api";
import { useState, useEffect } from "react";
import { usePlaynite } from "./hooks/usePlaynite";
import { showFailureToast } from "@raycast/utils";
import { PlayniteError, PlayniteErrorCode } from "./errors";

const DetailContent = {
  PLAYNITE_NOT_FOUND: `
# Playnite Not Found

Playnite's directory could not be found on your system.

- [Download Playnite](https://playnite.link/) if you haven't installed it yet.
- If you use a portable installation, please select the Playnite data directory in the extension settings.
`,
  EXTENSION_MISSING: `
# Playnite Extension Required

This extension requires the **FlowLauncherExporter** plugin for Playnite.

**To install:**
1. [Download the latest FlowLauncherExporter .pext file](https://github.com/Garulf/FlowLauncherExporter/releases/latest)
2. Open the file in Playnite and confirm installation

_Tip: You may need to update your Playnite library for your games to appear here._
`.trim(),
} as const;

function ErrorView({ error }: { error: Error }) {
  const isPlayniteError = error instanceof PlayniteError;

  if (isPlayniteError) {
    if (error.code === PlayniteErrorCode.PLAYNITE_PATH_INVALID) {
      return (
        <Detail
          markdown={DetailContent.PLAYNITE_NOT_FOUND}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Get Playnite" icon={Icon.Download} url={"https://playnite.link/"} />
              <Action
                title="Open Preferences"
                icon={Icon.Cog}
                onAction={async () => await openExtensionPreferences()}
              />
            </ActionPanel>
          }
        />
      );
    }

    if (error.code === PlayniteErrorCode.EXTENSION_MISSING) {
      return (
        <Detail
          markdown={DetailContent.EXTENSION_MISSING}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                // eslint-disable-next-line @raycast/prefer-title-case
                title="Get The FlowLauncherExporter Plugin"
                icon={Icon.Download}
                url="https://github.com/Garulf/FlowLauncherExporter/releases/latest"
              />
            </ActionPanel>
          }
        />
      );
    }

    return <Detail markdown={`# Error\n\n${error.extra !== undefined ? error.extra : "Unknown error"}`} />;
  }

  return <Detail markdown={`# Error\n\n${error.message}`} />;
}

export default function Command() {
  const { data, error, isLoading, launchGame, viewInPlaynite, openInstallFolder, defaultFilter } = usePlaynite();
  const [installFilter, setInstallFilter] = useState(defaultFilter || "installed");
  const [renderErrors, setRenderErrors] = useState<string[]>([]);

  useEffect(() => {
    if (renderErrors.length > 0) {
      showFailureToast(new Error(`${renderErrors.length} game(s) could not be displayed properly`), {
        title: "Some games failed to load",
      });
    }
  }, [renderErrors]);

  if (data.error != null && !isLoading) {
    return <ErrorView error={data.error} />;
  }
  if (error !== undefined && !isLoading) {
    return <ErrorView error={error} />;
  }

  const filteredGames = data.games
    .filter((game) => {
      if (installFilter === "installed") return game.IsInstalled;
      if (installFilter === "notInstalled") return !game.IsInstalled;
      return true;
    })
    .sort((a, b) => {
      if (a.Playtime > 0 && b.Playtime > 0) {
        return b.Playtime - a.Playtime;
      }
      if (a.Playtime > 0 && b.Playtime === 0) {
        return -1;
      }
      if (a.Playtime === 0 && b.Playtime > 0) {
        return 1;
      }
      return a.Name.localeCompare(b.Name);
    });

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search games..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by installation status" value={installFilter} onChange={setInstallFilter}>
          <List.Dropdown.Item title="Installed" value="installed" />
          <List.Dropdown.Item title="Not Installed" value="notInstalled" />
          <List.Dropdown.Item title="All" value="all" />
        </List.Dropdown>
      }
    >
      {filteredGames.map((game) => {
        try {
          return (
            <List.Item
              key={game.Id}
              title={game.Name}
              subtitle={game.Source?.Name || "Other"}
              icon={game.Icon ? { source: game.Icon, mask: Image.Mask.RoundedRectangle } : Icon.GameController}
              accessories={[
                ...(game.Playtime > 0 ? [{ tag: `${Math.round(game.Playtime / 3600)}h` }] : []),
                { text: game.IsInstalled ? "Installed" : "Not Installed" },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={game.IsInstalled ? "Launch Game" : "Game Not Installed"}
                    icon={game.IsInstalled ? Icon.Play : Icon.XMarkCircle}
                    onAction={() => launchGame(game)}
                  />
                  <Action title="View in Playnite" icon={Icon.Eye} onAction={() => viewInPlaynite(game)} />
                  {game.IsInstalled && game.InstallDirectory && (
                    <Action title="Open Install Folder" icon={Icon.Folder} onAction={() => openInstallFolder(game)} />
                  )}
                </ActionPanel>
              }
            />
          );
        } catch (error) {
          console.error(`Failed to render game: ${error}`);
          setRenderErrors((prev) => [...prev, `Game ID: ${game?.Id || "unknown"}`]);

          return (
            <List.Item
              key={game.Id ?? renderErrors.length}
              title="[ERROR] Failed to render game"
              subtitle={`ID: ${game?.Id || "unknown"}`}
              icon={Icon.ExclamationMark}
            />
          );
        }
      })}
    </List>
  );
}
