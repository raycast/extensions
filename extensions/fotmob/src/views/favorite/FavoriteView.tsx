import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useFavorite } from "@/hooks/useFavorite";
import { launchTeamCommand } from "@/utils/launcher/launchTeamDetailCommand";
import {
  buildLeagueDetailUrl,
  buildLeagueLogoUrl,
  buildPlayerDetailUrl,
  buildPlayerImageUrl,
  buildTeamLogoUrl,
} from "@/utils/url-builder";

export default function FavoriteView() {
  const favoriteService = useFavorite();

  return (
    <>
      <List.Section title={"Favorite Teams"} key={"favorite-team"}>
        {favoriteService.teams.map((team) => (
          <List.Item
            key={team.id}
            icon={buildTeamLogoUrl(team.id)}
            title={team.name}
            accessories={[
              {
                icon: buildLeagueLogoUrl(team.leagueId, "dark"),
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.AppWindowSidebarRight}
                  title="Show Details"
                  onAction={() => {
                    launchTeamCommand(team.id);
                  }}
                />
                <Action.CopyToClipboard
                  icon={Icon.Clipboard}
                  title={`Copy ID (${team.id})`}
                  content={team.id}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
                <Action
                  icon={Icon.StarDisabled}
                  title="Remove From Favorite"
                  onAction={async () => {
                    await favoriteService.removeItems("team", team.id);
                    showToast({
                      style: Toast.Style.Success,
                      title: "Removed from favorite",
                    });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title={"Favorite League"} key={"favorite-leagues"}>
        {favoriteService.leagues.map((league) => (
          <List.Item
            key={league.id}
            icon={buildLeagueLogoUrl(league.id)}
            title={league.name}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  icon={Icon.Globe}
                  title="Show Detail In Browser"
                  url={buildLeagueDetailUrl(league.id)}
                />
                <Action.CopyToClipboard
                  icon={Icon.Clipboard}
                  title={`Copy ID (${league.id})`}
                  content={league.id}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
                <Action
                  icon={Icon.StarDisabled}
                  title="Remove From Favorite"
                  onAction={() => favoriteService.removeItems("league", league.id)}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title={"Favorite players"} key={"favorite-players"}>
        {favoriteService.players.map((player) => (
          <List.Item
            key={player.id}
            icon={buildPlayerImageUrl(player.id)}
            title={player.name}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  icon={Icon.Globe}
                  title="Show Detail In Browser"
                  url={buildPlayerDetailUrl(player.id)}
                />
                <Action.CopyToClipboard
                  icon={Icon.Clipboard}
                  title={`Copy ID (${player.id})`}
                  content={player.id}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                />
                <Action
                  icon={Icon.StarDisabled}
                  title="Remove From Favorite"
                  onAction={() => favoriteService.removeItems("player", player.id)}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </>
  );
}
