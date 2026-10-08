import { useMemo } from "react";
import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import type { MatchFixture } from "@/types/team-detail";
import { useFavorite } from "@/hooks/useFavorite";
import { useTeamFixture } from "@/hooks/useTeamFixture";
import { buildTeamLogoUrl } from "@/utils/url-builder";
import EnhancedMatchItem from "@/views/common/EnhancedMatchItem";

function useTeamUpcomingMatches(teamId: string) {
  const { data, error, isLoading } = useTeamFixture(teamId);

  const upcomingMatches = useMemo(() => {
    if (!data?.calculated) return [];

    const matches: MatchFixture[] = [];

    // Add upcoming match if exists
    if (data.calculated.upcommingMatch && !data.calculated.upcommingMatch.status.finished) {
      matches.push(data.calculated.upcommingMatch);
    }

    // Add next matches that haven't started or finished
    const nextMatches = data.calculated.nextMatches.filter(
      (match: MatchFixture) => !match.status.finished && !match.status.started,
    );

    matches.push(...nextMatches);

    // Sort by date
    return matches
      .sort(
        (a: MatchFixture, b: MatchFixture) =>
          new Date(a.status.utcTime).getTime() - new Date(b.status.utcTime).getTime(),
      )
      .slice(0, 5); // Limit to next 5 matches per team
  }, [data]);

  return {
    upcomingMatches,
    isLoading,
    error,
  };
}

function TeamUpcomingMatches({ team }: { team: { id: string; name: string } }) {
  const { upcomingMatches, isLoading, error } = useTeamUpcomingMatches(team.id);
  const favoriteService = useFavorite();

  if (isLoading) {
    return (
      <List.Item
        icon={buildTeamLogoUrl(team.id)}
        title={`Loading matches for ${team.name}...`}
        accessories={[{ icon: Icon.Clock }]}
      />
    );
  }

  if (error || upcomingMatches.length === 0) {
    return (
      <List.Item
        icon={buildTeamLogoUrl(team.id)}
        title={`No upcoming matches for ${team.name}`}
        accessories={[{ icon: Icon.Calendar }]}
        actions={
          <ActionPanel>
            <Action
              icon={Icon.StarDisabled}
              title="Remove from Favorites"
              onAction={async () => {
                await favoriteService.removeItems("team", team.id);
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

  return (
    <>
      {upcomingMatches.map((match) => (
        <EnhancedMatchItem
          key={`${team.id}-${match.id}`}
          match={match}
          additionalActions={
            <>
              <Action.CopyToClipboard
                icon={Icon.Clipboard}
                title="Copy Match ID"
                content={match.id.toString()}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              <Action
                icon={Icon.StarDisabled}
                title="Remove Team from Favorites"
                onAction={async () => {
                  await favoriteService.removeItems("team", team.id);
                  showToast({
                    style: Toast.Style.Success,
                    title: "Removed from favorites",
                  });
                }}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
              />
            </>
          }
        />
      ))}
    </>
  );
}

export default function FavoriteUpcomingMatchesView() {
  const favoriteService = useFavorite();

  // This view handles loading state per team component
  // so we don't need a global loading state here

  if (favoriteService.teams.length === 0) {
    return (
      <List navigationTitle="Upcoming Matches - Favorites">
        <List.EmptyView
          icon={Icon.Star}
          title="No Favorite Teams"
          description="Add some teams to your favorites to see their upcoming matches here."
          actions={
            <ActionPanel>
              <Action
                icon={Icon.MagnifyingGlass}
                title="Search Teams"
                onAction={() => {
                  // This would typically navigate to search
                  showToast({
                    style: Toast.Style.Animated,
                    title: "Use the search command to find and add teams to favorites",
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
      navigationTitle="Upcoming Matches - Favorites"
      searchBarPlaceholder="Filter by team or opponent..."
      isLoading={false}
    >
      {favoriteService.teams.map((team: { id: string; name: string; leagueId: string }) => (
        <List.Section title={team.name} key={team.id}>
          <TeamUpcomingMatches team={team} />
        </List.Section>
      ))}
    </List>
  );
}
