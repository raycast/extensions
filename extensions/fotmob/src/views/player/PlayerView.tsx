import { Action, ActionPanel, Detail, Icon, Toast, showToast } from "@raycast/api";
import { useFavorite } from "@/hooks/useFavorite";
import { usePlayerDetail } from "@/hooks/usePlayerDetail";
import { launchTeamCommand } from "@/utils/launcher/launchTeamDetailCommand";
import { buildPlayerDetailUrl, buildPlayerImageUrl, buildTeamDetailUrl } from "@/utils/url-builder";

interface PlayerViewProps {
  id: string;
}

export default function PlayerView({ id }: PlayerViewProps) {
  const { playerDetail, isLoading, error } = usePlayerDetail(id);
  const favoriteService = useFavorite();

  const isFavorite = favoriteService.players.some((player) => player.id === id);

  const handleAddToFavorites = async () => {
    await favoriteService.addItems({
      type: "player",
      value: {
        id: id,
        isCoach: playerDetail.meta?.position === "Coach" || false,
        name: playerDetail.name,
      },
    });
    showToast({
      style: Toast.Style.Success,
      title: "Added to Favorites",
      message: `${playerDetail.name} has been added to your favorites`,
    });
  };

  const handleRemoveFromFavorites = async () => {
    await favoriteService.removeItems("player", id);
    showToast({
      style: Toast.Style.Success,
      title: "Removed from Favorites",
      message: `${playerDetail.name} has been removed from your favorites`,
    });
  };

  if (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return (
      <Detail
        markdown={`# Player Not Found

We couldn't find detailed information for this player.

**Player ID:** ${id}

## Possible reasons:

- The player ID might not exist in the FotMob database
- The player might be from a lower league not covered by FotMob
- The player might be a youth player or reserve team member
- There might be a temporary issue with the data source

## What you can do:

### 1. **Search by Name**
Use the "Search Players" command to find the player by name instead of ID. This is often more reliable.

### 2. **Verify the ID**
Check if the player exists on FotMob's website using the browser link below.

### 3. **Try Alternative Sources**
If the player doesn't exist on FotMob, they might be available on other football databases.

---

**Error Details:** ${errorMessage}
`}
        navigationTitle="Player Not Found"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open in Browser" icon={Icon.Globe} url={buildPlayerDetailUrl(id)} />
            <Action.CopyToClipboard
              title="Copy Player ID"
              icon={Icon.Clipboard}
              content={id}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action
              title="Search Players by Name"
              icon={Icon.MagnifyingGlass}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() => {
                showToast({
                  style: Toast.Style.Success,
                  title: "Tip",
                  message: "Use 'Search Players' command to find the correct player by name",
                });
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  const generateMarkdown = () => {
    const isLimitedData =
      playerDetail.name === `Player ${playerDetail.id}` || playerDetail.meta?.position === "Unknown";

    let markdown = `# ${playerDetail.name}\n\n`;

    // Player image
    const imageUrl = playerDetail.imageUrl || buildPlayerImageUrl(playerDetail.id);
    markdown += `![${playerDetail.name}](${imageUrl})\n\n`;

    // Basic Info
    markdown += `## Player Information\n\n`;
    markdown += `**Player ID:** ${playerDetail.id}\n\n`;

    if (playerDetail.meta?.position && playerDetail.meta.position !== "Unknown") {
      markdown += `**Position:** ${playerDetail.meta.position}\n\n`;
    }

    // Current Team
    if (playerDetail.primaryTeam) {
      markdown += `**Current Team:** ${playerDetail.primaryTeam.name}\n\n`;
    }

    // Data Limitations Notice
    if (isLimitedData) {
      markdown += `---\n\n`;
      markdown += `## ℹ️ Limited Player Data\n\n`;
      markdown += `This player exists on FotMob but has limited information available through the API. This is common for:\n\n`;
      markdown += `• Players from lower leagues\n`;
      markdown += `• Youth or reserve team players\n`;
      markdown += `• Recently transferred players\n`;
      markdown += `• Players with updated profiles\n\n`;
      markdown += `**💡 Tip:** Use the "Open in Browser" button below to view complete player information on the FotMob website.\n\n`;
      markdown += `**🔍 Alternative:** Try searching for the player by name using the "Search Players" command for better results.\n\n`;
    }

    return markdown;
  };

  const isLimitedData = playerDetail.name === `Player ${playerDetail.id}` || playerDetail.meta?.position === "Unknown";

  return (
    <Detail
      isLoading={isLoading}
      markdown={generateMarkdown()}
      navigationTitle={isLimitedData ? `Player ${playerDetail.id} (Limited Data)` : playerDetail.name}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" icon={Icon.Globe} url={buildPlayerDetailUrl(playerDetail.id)} />
          {isLimitedData && (
            <Action
              title="Search Players by Name"
              icon={Icon.MagnifyingGlass}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              onAction={() => {
                showToast({
                  style: Toast.Style.Success,
                  title: "Tip",
                  message: "Use 'Search Players' command to find more detailed player information by name",
                });
              }}
            />
          )}
          <Action
            icon={isFavorite ? Icon.StarDisabled : Icon.Star}
            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            onAction={isFavorite ? handleRemoveFromFavorites : handleAddToFavorites}
          />
          {playerDetail.primaryTeam && (
            <Action
              icon={Icon.Person}
              title="View Team Details"
              onAction={() => launchTeamCommand(playerDetail.primaryTeam?.id.toString() || "0")}
            />
          )}
          <Action.CopyToClipboard
            title="Copy Player ID"
            content={playerDetail.id.toString()}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {playerDetail.primaryTeam && (
            <Action.OpenInBrowser
              title="Open Team in Browser"
              icon={Icon.Globe}
              url={buildTeamDetailUrl(playerDetail.primaryTeam.id)}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
