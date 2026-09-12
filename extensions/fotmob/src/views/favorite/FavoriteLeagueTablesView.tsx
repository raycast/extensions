import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import type { DisplayableTable } from "@/types/league-detail";
import { useFavorite } from "@/hooks/useFavorite";
import { useLeagueDetail } from "@/hooks/useLeagueDetail";
import { buildLeagueDetailUrl, buildLeagueLogoUrl, buildTeamDetailUrl, buildTeamLogoUrl } from "@/utils/url-builder";

function LeagueTableSection({ league }: { league: { id: string; name: string; countryCode: string } }) {
  const { data, error, isLoading } = useLeagueDetail(league.id);
  const favoriteService = useFavorite();

  if (isLoading) {
    return (
      <List.Item
        icon={buildLeagueLogoUrl(league.id)}
        title={`Loading table for ${league.name}...`}
        accessories={[{ icon: Icon.Clock }]}
      />
    );
  }

  if (error || !data) {
    return (
      <List.Item
        icon={buildLeagueLogoUrl(league.id)}
        title={`Failed to load ${league.name} table`}
        accessories={[{ icon: Icon.ExclamationMark }]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser icon={Icon.Globe} title="View on Fotmob" url={buildLeagueDetailUrl(league.id)} />
            <Action
              icon={Icon.StarDisabled}
              title="Remove from Favorites"
              onAction={async () => {
                await favoriteService.removeItems("league", league.id);
                showToast({
                  style: Toast.Style.Success,
                  title: "Removed from favorites",
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Extract table data
  let displayableTables: DisplayableTable[] = [];

  if (data.overview?.table) {
    displayableTables = data.overview.table.tables.map((table) => ({
      tableName: table.tableName || "League Table",
      teams: table.tableRows,
      legend: data.overview?.table.legend,
    }));
  } else if (data.table && data.table.length > 0) {
    displayableTables = data.table.flatMap((leagueTable) =>
      leagueTable.tables.map((table) => ({
        tableName: table.tableName || "League Table",
        teams: table.tableRows,
        legend: leagueTable.legend,
      })),
    );
  }

  if (displayableTables.length === 0) {
    return (
      <List.Item
        icon={buildLeagueLogoUrl(league.id)}
        title={`No table data for ${league.name}`}
        accessories={[{ icon: Icon.List }]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser icon={Icon.Globe} title="View on Fotmob" url={buildLeagueDetailUrl(league.id)} />
            <Action
              icon={Icon.StarDisabled}
              title="Remove from Favorites"
              onAction={async () => {
                await favoriteService.removeItems("league", league.id);
                showToast({
                  style: Toast.Style.Success,
                  title: "Removed from favorites",
                });
              }}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Show top teams from the main table (usually the first one)
  const mainTable = displayableTables[0];
  const topTeams = mainTable.teams.slice(0, 5); // Show top 5 teams

  return (
    <>
      {topTeams.map((team, index) => {
        const position = team.idx || index + 1;
        const isTopPosition = position <= 3;

        return (
          <List.Item
            key={`${league.id}-${team.id}`}
            icon={buildTeamLogoUrl(team.id)}
            title={`${position}. ${team.name}`}
            subtitle={`${team.points} pts • ${team.wins}W ${team.draws}D ${team.losses}L`}
            accessories={[
              {
                text: `${team.scoresFor}:${team.scoresAgainst}`,
                tooltip: "Goals For:Against",
              },
              {
                text: `${team.goalDifference > 0 ? "+" : ""}${team.goalDifference}`,
                tooltip: "Goal Difference",
              },
              ...(isTopPosition
                ? [
                    {
                      icon: {
                        source: Icon.Star,
                        tintColor: position === 1 ? "#FFD700" : "#C0C0C0",
                      },
                    },
                  ]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser icon={Icon.Globe} title="Show Team Details" url={buildTeamDetailUrl(team.id)} />
                <Action.OpenInBrowser
                  icon={Icon.List}
                  title="View Full League Table"
                  url={buildLeagueDetailUrl(league.id)}
                />
                <Action.CopyToClipboard
                  icon={Icon.Clipboard}
                  title="Copy Team Name"
                  content={team.name}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
                <Action
                  icon={Icon.StarDisabled}
                  title="Remove League from Favorites"
                  onAction={async () => {
                    await favoriteService.removeItems("league", league.id);
                    showToast({
                      style: Toast.Style.Success,
                      title: "Removed from favorites",
                    });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </>
  );
}

export default function FavoriteLeagueTablesView() {
  const favoriteService = useFavorite();

  if (favoriteService.leagues.length === 0) {
    return (
      <List navigationTitle="League Tables - Favorites">
        <List.EmptyView
          icon={Icon.Star}
          title="No Favorite Leagues"
          description="Add some leagues to your favorites to see their tables here."
          actions={
            <ActionPanel>
              <Action
                icon={Icon.MagnifyingGlass}
                title="Search Leagues"
                onAction={() => {
                  showToast({
                    style: Toast.Style.Animated,
                    title: "Use the search command to find and add leagues to favorites",
                  });
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      navigationTitle="League Tables - Favorites"
      searchBarPlaceholder="Filter by league or team..."
      isLoading={false}
    >
      {favoriteService.leagues.map((league) => (
        <List.Section title={league.name} key={league.id}>
          <LeagueTableSection league={league} />
        </List.Section>
      ))}
    </List>
  );
}
