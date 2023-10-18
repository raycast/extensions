import { ActionPanel, List, Action, showToast, Toast, Icon } from "@raycast/api";
import { useFavorite } from "../../services/useFavorite";
import {
  buildLeagueDetailUrl,
  buildLeagueLogoUrl,
  buildPlayerDetailUrl,
  buildPlayerImageUrl,
  buildTeamLogoUrl,
} from "../../utils/url-builder";
import { launchTeamCommand } from "../../utils/launcher/launchTeamDetailCommand";

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
            subtitle={`ID: ${team.id}`}
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
            subtitle={`ID: ${league.id}`}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  icon={Icon.Globe}
                  title="Show Detail In Browser"
                  url={buildLeagueDetailUrl(league.id)}
                />
                <Action
                  icon={Icon.StarDisabled}
                  title="Remove From Favorite"
                  onAction={() => favoriteService.removeItems("league", league.id)}
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
            subtitle={`ID: ${player.id}`}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  icon={Icon.Globe}
                  title="Show Detail In Browser"
                  url={buildPlayerDetailUrl(player.id)}
                />
                <Action
                  icon={Icon.StarDisabled}
                  title="Remove From Favorite"
                  onAction={() => favoriteService.removeItems("player", player.id)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </>
  );
}
