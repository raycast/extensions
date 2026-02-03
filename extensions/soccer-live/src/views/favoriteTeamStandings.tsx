import { List, Color, Icon, Action, ActionPanel } from "@raycast/api";
import { useMemo } from "react";
import { getFavoriteTeams, removeFavoriteTeam, FavoriteTeam } from "../utils/favoriteTeams";
import getStandings from "../utils/getStandings";

interface Props {
  favoriteTeams: FavoriteTeam[];
  setFavoriteTeams: (teams: FavoriteTeam[]) => void;
  dropdown: JSX.Element;
}

export default function TeamStandingsView({ favoriteTeams, setFavoriteTeams, dropdown }: Props) {
  // Call all hooks at top level - fetch standings for expanded list of leagues
  const engStandings = getStandings("ENG.1");
  const espStandings = getStandings("ESP.1");
  const gerStandings = getStandings("GER.1");
  const itaStandings = getStandings("ITA.1");
  const fraStandings = getStandings("FRA.1");
  const nedStandings = getStandings("NED.1");
  const porStandings = getStandings("POR.1");
  const belStandings = getStandings("BEL.1");
  const scoStandings = getStandings("SCO.1");
  const turStandings = getStandings("TUR.1");
  const uefaChampionsStandings = getStandings("uefa.champions");
  const uefaEuropaStandings = getStandings("uefa.europa");
  const uefaEuroStandings = getStandings("uefa.euro");
  const fifaWorldStandings = getStandings("fifa.world");
  const africaCupStandings = getStandings("africa.cup");

  const standingsByLeague = useMemo(() => {
    return {
      "ENG.1": engStandings,
      "ESP.1": espStandings,
      "GER.1": gerStandings,
      "ITA.1": itaStandings,
      "FRA.1": fraStandings,
      "NED.1": nedStandings,
      "POR.1": porStandings,
      "BEL.1": belStandings,
      "SCO.1": scoStandings,
      "TUR.1": turStandings,
      "uefa.champions": uefaChampionsStandings,
      "uefa.europa": uefaEuropaStandings,
      "uefa.euro": uefaEuroStandings,
      "fifa.world": fifaWorldStandings,
      "africa.cup": africaCupStandings,
    };
  }, [
    engStandings.standingsData,
    espStandings.standingsData,
    gerStandings.standingsData,
    itaStandings.standingsData,
    fraStandings.standingsData,
    nedStandings.standingsData,
    porStandings.standingsData,
    belStandings.standingsData,
    scoStandings.standingsData,
    turStandings.standingsData,
    uefaChampionsStandings.standingsData,
    uefaEuropaStandings.standingsData,
    uefaEuroStandings.standingsData,
    fifaWorldStandings.standingsData,
    africaCupStandings.standingsData,
  ]);

  const findStat = (stats: { name: string; displayValue: string }[], key: string): string =>
    stats?.find((stat) => stat.name === key)?.displayValue ?? "0";

  const findRecord = (stats: { name: string; summary: string }[], key: string): string =>
    stats?.find((stat) => stat.name === key)?.summary ?? "0-0";

  return (
    <List searchBarPlaceholder="Search for a team" searchBarAccessory={dropdown} filtering={true}>
      {favoriteTeams.map((team) => {
        const standingsData = standingsByLeague[team.leagueCode]?.standingsData;
        const items1 = standingsData?.children?.[0]?.standings?.entries || [];
        const items2 = standingsData?.children?.[1]?.standings?.entries || [];
        const allItems = [...items1, ...items2];
        const teamStanding = allItems.find((entry) => entry.team.id === team.id);

        if (!teamStanding) {
          return (
            <List.Section key={team.id} title={`${team.name} (${team.leagueName})`}>
              <List.Item title="Standings not available" icon="soccer-field.png" />
            </List.Section>
          );
        }

        const position = Number(findStat(teamStanding?.stats, "rank")) || 0;
        const stat1 = `${findStat(teamStanding?.stats, "gamesPlayed")} GP |`;
        const stat2 = `${findRecord(teamStanding?.stats, "overall")} |`;
        const stat3 = `${findStat(teamStanding?.stats, "points")} pts |`;
        const stat4 = `GF: ${findStat(teamStanding?.stats, "pointsFor")} |`;
        const stat5 = `GA: ${findStat(teamStanding?.stats, "pointsAgainst")}`;

        return (
          <List.Section key={team.id} title={`${team.name} (${team.leagueName})`}>
            <List.Item
              title={`Position: #${position}`}
              subtitle={`${stat1} ${stat2} ${stat3} ${stat4} ${stat5}`}
              icon={{
                source: team.logo || teamStanding.team.logos?.[0]?.href || "soccer-field.png",
              }}
              accessories={[
                {
                  tag: { value: `#${position}`, color: position <= 4 ? Color.Green : Color.SecondaryText },
                  icon: Icon.Star,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Remove from Favorites"
                    icon={Icon.StarDisabled}
                    onAction={async () => {
                      await removeFavoriteTeam(team.id, team.leagueCode);
                      const teams = await getFavoriteTeams();
                      setFavoriteTeams(teams);
                    }}
                  />
                  <Action.OpenInBrowser
                    title="View on Espn"
                    url={
                      teamStanding.team.links?.[0]?.href ||
                      `https://www.espn.com/soccer/standings/_/league/${team.leagueCode}`
                    }
                  />
                </ActionPanel>
              }
            />
          </List.Section>
        );
      })}
    </List>
  );
}
