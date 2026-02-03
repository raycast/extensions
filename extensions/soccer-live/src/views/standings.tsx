import { List, LocalStorage, Color, Icon, Action, ActionPanel } from "@raycast/api";
import { useEffect, useState } from "react";
import getStandings from "../utils/getStandings";
import { addFavoriteTeam, removeFavoriteTeam, getFavoriteTeams, FavoriteTeam } from "../utils/favoriteTeams";
import { ALL_LEAGUES, getLeagueByCode } from "../utils/leagueConstants";

export default function Standings() {
  const [currentLeague, setCurrentLeague] = useState("ENG.1");
  const [favoriteTeams, setFavoriteTeams] = useState<FavoriteTeam[]>([]);
  const { standingsData, standingsLoading } = getStandings(currentLeague);

  useEffect(() => {
    async function loadStoredLeague() {
      const storedValue = await LocalStorage.getItem("soccerStandingsLeague");
      if (typeof storedValue === "string") {
        setCurrentLeague(storedValue);
      }
    }
    loadStoredLeague();
  }, []);

  useEffect(() => {
    async function loadFavoriteTeams() {
      const teams = await getFavoriteTeams();
      setFavoriteTeams(teams);
    }
    loadFavoriteTeams();
  }, [currentLeague]);

  const handleLeagueChange = async (leagueCode: string) => {
    setCurrentLeague(leagueCode);
    await LocalStorage.setItem("soccerStandingsLeague", leagueCode);
  };

  const leagueName = getLeagueByCode(currentLeague)?.name || "Premier League";

  const findStat = (stats: { name: string; displayValue: string }[], key: string): string =>
    stats?.find((stat) => stat.name === key)?.displayValue ?? "0";

  const findRecord = (stats: { name: string; summary: string }[], key: string): string =>
    stats?.find((stat) => stat.name === key)?.summary ?? "0-0";

  const items1 = standingsData?.children?.[0]?.standings?.entries || [];
  const items2 = standingsData?.children?.[1]?.standings?.entries || [];

  interface TeamEntry {
    team: { id: string; displayName: string; abbreviation: string; logo?: string; links?: Array<{ href: string }> };
    stats: Array<{ name: string; displayValue?: string; summary?: string }>;
  }

  const renderTeamItem = (team: TeamEntry, index: number, position: number, isFavorite: boolean) => {
    const stat1 = `${findStat(team?.stats, "gamesPlayed")} GP |`;
    const stat2 = `${findRecord(team?.stats, "overall")} |`;
    const stat3 = `${findStat(team?.stats, "points")} pts |`;
    const stat4 = `GF: ${findStat(team?.stats, "pointsFor")} |`;
    const stat5 = `GA: ${findStat(team?.stats, "pointsAgainst")}`;

    const tagColor = position <= 4 ? Color.Green : position <= 6 ? Color.Blue : Color.SecondaryText;
    const tagIcon = isFavorite ? Icon.Star : undefined;

    return (
      <List.Item
        key={`${team.team.id}-${index}`}
        title={`${position}. ${team.team.displayName}`}
        subtitle={`${stat1} ${stat2} ${stat3} ${stat4} ${stat5}`}
        icon={{
          source: team.team.logos?.[0]?.href || "soccer-field.png",
        }}
        accessories={[
          {
            tag: { value: `#${position}`, color: tagColor },
            icon: tagIcon,
            tooltip: isFavorite ? "Favorite Team" : undefined,
          },
        ]}
        actions={
          <ActionPanel>
            {isFavorite ? (
              <Action
                title="Remove from Favorites"
                icon={Icon.StarDisabled}
                onAction={async () => {
                  await removeFavoriteTeam(team.team.id, currentLeague);
                  const teams = await getFavoriteTeams();
                  setFavoriteTeams(teams);
                }}
              />
            ) : (
              <Action
                title="Add to Favorites"
                icon={Icon.Star}
                onAction={async () => {
                  const favoriteTeam: FavoriteTeam = {
                    id: team.team.id,
                    name: team.team.displayName,
                    leagueCode: currentLeague,
                    leagueName: leagueName,
                    logo: team.team.logos?.[0]?.href,
                  };
                  await addFavoriteTeam(favoriteTeam);
                  const teams = await getFavoriteTeams();
                  setFavoriteTeams(teams);
                }}
              />
            )}
            <Action.OpenInBrowser
              title="View on Espn"
              url={team.team.links?.[0]?.href || `https://www.espn.com/soccer/standings/_/league/${currentLeague}`}
            />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      searchBarPlaceholder="Search for a team"
      searchBarAccessory={
        <List.Dropdown tooltip="Select League" onChange={handleLeagueChange} value={currentLeague}>
          {ALL_LEAGUES.map((league) => (
            <List.Dropdown.Item key={league.code} title={league.name} value={league.code} />
          ))}
        </List.Dropdown>
      }
      isLoading={standingsLoading}
      filtering={true}
    >
      {items1.length > 0 && (
        <List.Section title={standingsData?.children?.[0]?.name || "Standings"}>
          {items1.map((team, index) => {
            const position = Number(findStat(team?.stats, "rank")) || index + 1;
            const isFavorite = favoriteTeams.some((ft) => ft.id === team.team.id && ft.leagueCode === currentLeague);
            return renderTeamItem(team, index, position, isFavorite);
          })}
        </List.Section>
      )}
      {items2.length > 0 && (
        <List.Section title={standingsData?.children?.[1]?.name || "Standings"}>
          {items2.map((team, index) => {
            const position = Number(findStat(team?.stats, "rank")) || index + 1;
            const isFavorite = favoriteTeams.some((ft) => ft.id === team.team.id && ft.leagueCode === currentLeague);
            return renderTeamItem(team, index, position, isFavorite);
          })}
        </List.Section>
      )}
      {items1.length === 0 && items2.length === 0 && !standingsLoading && (
        <List.EmptyView icon="soccer-field.png" title="No Standings Available" />
      )}
    </List>
  );
}
