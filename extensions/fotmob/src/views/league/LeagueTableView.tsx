import { useMemo } from "react";
import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import type { DisplayableTable, LeagueTableTeam } from "@/types/league-detail";
import { useFavorite } from "@/hooks/useFavorite";
import { useLeagueDetail } from "@/hooks/useLeagueDetail";
import { launchTeamCommand } from "@/utils/launcher/launchTeamDetailCommand";
import { buildLeagueDetailUrl, buildTeamDetailUrl, buildTeamLogoUrl } from "@/utils/url-builder";

interface LeagueTableViewProps {
  leagueId: string;
  leagueName?: string;
}

function TeamTableItem({ team, position, leagueId }: { team: LeagueTableTeam; position: number; leagueId: string }) {
  const qualColor = team.qualColor ? getQualificationColor(team.qualColor) : undefined;
  const favoriteService = useFavorite();

  // Check if team is already in favorites
  const isTeamFavorited = favoriteService.teams.some((favTeam) => favTeam.id === team.id.toString());

  // Create team object for favorites
  const teamForFavorites = {
    id: team.id.toString(),
    name: team.name,
    leagueId: leagueId,
  };

  return (
    <List.Item
      icon={buildTeamLogoUrl(team.id)}
      title={`${position}. ${team.name}`}
      subtitle={`${team.points} pts`}
      accessories={[
        { text: `${team.played}`, tooltip: "Played" },
        { text: `${team.wins}`, tooltip: "Wins" },
        { text: `${team.draws}`, tooltip: "Draws" },
        { text: `${team.losses}`, tooltip: "Losses" },
        {
          text: `${team.scoresFor}:${team.scoresAgainst}`,
          tooltip: "Goals For:Against",
        },
        {
          text: `${team.goalDifference > 0 ? "+" : ""}${team.goalDifference}`,
          tooltip: "Goal Difference",
        },
        ...(qualColor ? [{ icon: { source: Icon.Circle, tintColor: qualColor } }] : []),
      ]}
      actions={
        <ActionPanel>
          <Action
            icon={Icon.AppWindowSidebarRight}
            title="Show Team Details"
            onAction={() => {
              launchTeamCommand(team.id.toString());
            }}
          />
          <Action.OpenInBrowser icon={Icon.Globe} title="View Team on Fotmob" url={buildTeamDetailUrl(team.id)} />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title={`Copy Team ID (${team.id})`}
            content={team.id.toString()}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          {isTeamFavorited ? (
            <Action
              icon={Icon.StarDisabled}
              title="Remove Team from Favorites"
              onAction={async () => {
                await favoriteService.removeItems("team", team.id.toString());
                showToast({
                  style: Toast.Style.Success,
                  title: "Removed from favorites",
                  message: `${team.name} removed from favorites`,
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          ) : (
            <Action
              icon={Icon.Star}
              title="Add Team to Favorites"
              onAction={async () => {
                await favoriteService.addItems({
                  type: "team",
                  value: teamForFavorites,
                });
                showToast({
                  style: Toast.Style.Success,
                  title: "Added to favorites",
                  message: `${team.name} added to favorites`,
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function getQualificationColor(qualColor: string): Color {
  switch (qualColor?.toLowerCase()) {
    case "#0070f3":
    case "blue":
      return Color.Blue;
    case "#10b981":
    case "green":
      return Color.Green;
    case "#f59e0b":
    case "orange":
      return Color.Orange;
    case "#ef4444":
    case "red":
      return Color.Red;
    case "#8b5cf6":
    case "purple":
      return Color.Purple;
    default:
      return Color.SecondaryText;
  }
}

export default function LeagueTableView({ leagueId, leagueName }: LeagueTableViewProps) {
  const { data, error, isLoading } = useLeagueDetail(leagueId);
  const favoriteService = useFavorite();

  // Check if league is already in favorites
  const isLeagueFavorited = favoriteService.leagues.some((league) => league.id === leagueId);

  // Create league object for favorites
  const leagueForFavorites = {
    id: leagueId,
    name: leagueName || data?.details?.name || `League ${leagueId}`,
    countryCode: data?.details?.country || "",
  };

  const displayableTables = useMemo((): DisplayableTable[] => {
    if (!data) return [];

    // Check if we have overview table (most common)
    if (data.overview?.table) {
      return data.overview.table.tables.map((table) => ({
        tableName: table.tableName || "League Table",
        teams: table.tableRows,
        legend: data.overview?.table.legend,
      }));
    }

    // Check if we have table array
    if (data.table && data.table.length > 0) {
      return data.table.flatMap((leagueTable) =>
        leagueTable.tables.map((table) => ({
          tableName: table.tableName || "League Table",
          teams: table.tableRows,
          legend: leagueTable.legend,
        })),
      );
    }

    return [];
  }, [data]);

  if (isLoading) {
    return <List isLoading={true} navigationTitle={leagueName ? `${leagueName} - Table` : "League Table"} />;
  }

  if (error) {
    return (
      <List navigationTitle={leagueName ? `${leagueName} - Table` : "League Table"}>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Error Loading League Table"
          description="Failed to fetch league table data. Please try again later."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={Icon.Globe} title="View on Fotmob" url={buildLeagueDetailUrl(leagueId)} />
              <Action.CopyToClipboard
                icon={Icon.Clipboard}
                title={`Copy League ID (${leagueId})`}
                content={leagueId}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              {isLeagueFavorited ? (
                <Action
                  icon={Icon.StarDisabled}
                  title="Remove League from Favorites"
                  onAction={async () => {
                    await favoriteService.removeItems("league", leagueId);
                    showToast({
                      style: Toast.Style.Success,
                      title: "Removed from favorites",
                      message: `${leagueForFavorites.name} removed from favorites`,
                    });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
              ) : (
                <Action
                  icon={Icon.Star}
                  title="Add League to Favorites"
                  onAction={async () => {
                    await favoriteService.addItems({
                      type: "league",
                      value: leagueForFavorites,
                    });
                    showToast({
                      style: Toast.Style.Success,
                      title: "Added to favorites",
                      message: `${leagueForFavorites.name} added to favorites`,
                    });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                />
              )}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (displayableTables.length === 0) {
    return (
      <List navigationTitle={leagueName ? `${leagueName} - Table` : "League Table"}>
        <List.EmptyView
          icon={Icon.List}
          title="No Table Data Available"
          description="This league doesn't have table data available."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={Icon.Globe} title="View on Fotmob" url={buildLeagueDetailUrl(leagueId)} />
              <Action.CopyToClipboard
                icon={Icon.Clipboard}
                title={`Copy League ID (${leagueId})`}
                content={leagueId}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              {isLeagueFavorited ? (
                <Action
                  icon={Icon.StarDisabled}
                  title="Remove League from Favorites"
                  onAction={async () => {
                    await favoriteService.removeItems("league", leagueId);
                    showToast({
                      style: Toast.Style.Success,
                      title: "Removed from favorites",
                      message: `${leagueForFavorites.name} removed from favorites`,
                    });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
              ) : (
                <Action
                  icon={Icon.Star}
                  title="Add League to Favorites"
                  onAction={async () => {
                    await favoriteService.addItems({
                      type: "league",
                      value: leagueForFavorites,
                    });
                    showToast({
                      style: Toast.Style.Success,
                      title: "Added to favorites",
                      message: `${leagueForFavorites.name} added to favorites`,
                    });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                />
              )}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      navigationTitle={leagueName ? `${leagueName} - Table` : "League Table"}
      searchBarPlaceholder="Filter teams..."
      actions={
        <ActionPanel>
          <Action.OpenInBrowser icon={Icon.Globe} title="View Full Details" url={buildLeagueDetailUrl(leagueId)} />
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title={`Copy League ID (${leagueId})`}
            content={leagueId}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          {isLeagueFavorited ? (
            <Action
              icon={Icon.StarDisabled}
              title="Remove League from Favorites"
              onAction={async () => {
                await favoriteService.removeItems("league", leagueId);
                showToast({
                  style: Toast.Style.Success,
                  title: "Removed from favorites",
                  message: `${leagueForFavorites.name} removed from favorites`,
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          ) : (
            <Action
              icon={Icon.Star}
              title="Add League to Favorites"
              onAction={async () => {
                await favoriteService.addItems({
                  type: "league",
                  value: leagueForFavorites,
                });
                showToast({
                  style: Toast.Style.Success,
                  title: "Added to favorites",
                  message: `${leagueForFavorites.name} added to favorites`,
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
          )}
        </ActionPanel>
      }
    >
      {displayableTables.map((table, tableIndex) => (
        <List.Section
          key={`${tableIndex}-${table.tableName}`}
          title={displayableTables.length > 1 ? table.tableName : undefined}
        >
          {table.teams.map((team, index) => (
            <TeamTableItem key={team.id} team={team} position={team.idx || index + 1} leagueId={leagueId} />
          ))}
          {table.legend && table.legend.length > 0 && (
            <List.Item
              icon={Icon.Info}
              title="Legend"
              accessories={table.legend.map((legendItem) => ({
                icon: {
                  source: Icon.Circle,
                  tintColor: getQualificationColor(legendItem.color),
                },
                text: legendItem.title,
                tooltip: legendItem.title,
              }))}
            />
          )}
        </List.Section>
      ))}
    </List>
  );
}
