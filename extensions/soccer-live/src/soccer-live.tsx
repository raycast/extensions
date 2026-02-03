import { List, LocalStorage, Color, Icon, Action, ActionPanel } from "@raycast/api";
import { useEffect, useState } from "react";
import getLiveMatches, { Game } from "./utils/getLiveMatches";
import MatchStatistics from "./views/matchStatistics";

export default function SoccerLive() {
  const { allMatches, isLoading } = getLiveMatches();
  const [selectedLeague, setSelectedLeague] = useState<string>("");

  useEffect(() => {
    async function loadStoredLeague() {
      const storedValue = await LocalStorage.getItem("selectedSoccerLeague");
      if (typeof storedValue === "string" && storedValue) {
        setSelectedLeague(storedValue);
      }
    }
    loadStoredLeague();
  }, []);

  // Group matches by league
  const matchesByLeague = allMatches.reduce(
    (acc, match) => {
      const leagueName = match.leagueName || "Other";
      if (!acc[leagueName]) {
        acc[leagueName] = [];
      }
      acc[leagueName].push(match);
      return acc;
    },
    {} as Record<string, Array<Game & { leagueName: string; leagueCode: string }>>,
  );

  const selectedLeagueMatches = selectedLeague ? matchesByLeague[selectedLeague] || [] : [];

  const handleLeagueSelect = async (leagueName: string) => {
    setSelectedLeague(leagueName);
    await LocalStorage.setItem("selectedSoccerLeague", leagueName);
  };

  if (isLoading && allMatches.length === 0) {
    return <List isLoading={true} searchBarPlaceholder="Loading live matches..." />;
  }

  if (allMatches.length === 0) {
    return (
      <List searchBarPlaceholder="No live matches found">
        <List.EmptyView
          icon="soccer-field.png"
          title="No Live Matches"
          description="There are currently no live matches across all leagues."
        />
      </List>
    );
  }

  return (
    <List
      searchBarPlaceholder="Search for a match or team"
      searchBarAccessory={
        <List.Dropdown tooltip="Select League" onChange={handleLeagueSelect} value={selectedLeague}>
          <List.Dropdown.Item title="Select a league..." value="" />
          {Object.keys(matchesByLeague).map((leagueName) => {
            const matchCount = matchesByLeague[leagueName].length;
            return (
              <List.Dropdown.Item
                key={leagueName}
                title={`${leagueName} (${matchCount} ${matchCount === 1 ? "match" : "matches"})`}
                value={leagueName}
              />
            );
          })}
        </List.Dropdown>
      }
      isLoading={isLoading}
      filtering={true}
    >
      {(() => {
        const matchesToShow = selectedLeague ? selectedLeagueMatches : allMatches;

        if (matchesToShow.length === 0) {
          return selectedLeague ? (
            <List.EmptyView
              icon="soccer-field.png"
              title="No Live Matches"
              description={`There are currently no live matches in ${selectedLeague}.`}
            />
          ) : (
            <List.EmptyView
              icon="soccer-field.png"
              title="No Live Matches"
              description="There are currently no live matches across all leagues."
            />
          );
        }

        if (selectedLeague) {
          // Show matches from selected league
          return (
            <List.Section title={`${selectedLeague} - Live Matches`}>
              {matchesToShow.map((match) => {
                const homeTeam = match.competitions[0]?.competitors[1]?.team;
                const awayTeam = match.competitions[0]?.competitors[0]?.team;
                const homeScore = match.competitions[0]?.competitors[1]?.score || "0";
                const awayScore = match.competitions[0]?.competitors[0]?.score || "0";
                const status = match.competitions[0]?.status;
                const clock = status?.displayClock || status?.type?.detail || "Live";

                return (
                  <List.Item
                    key={match.id}
                    title={match.name}
                    subtitle={clock}
                    keywords={[
                      match.name,
                      homeTeam?.displayName || "",
                      awayTeam?.displayName || "",
                      homeTeam?.abbreviation || "",
                      awayTeam?.abbreviation || "",
                      match.leagueName || "",
                    ]}
                    icon={{
                      source: homeTeam?.logo || "Empty.png",
                    }}
                    accessories={[
                      {
                        text: {
                          value: `${awayTeam?.abbreviation || "Away"} ${awayScore} - ${homeScore} ${homeTeam?.abbreviation || "Home"}`,
                          color: Color.Green,
                        },
                        tooltip: "Live Score",
                      },
                      { icon: { source: Icon.Livestream, tintColor: Color.Green } },
                    ]}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="View Match Statistics"
                          icon={Icon.BarChart}
                          target={
                            <MatchStatistics
                              gameId={match.id}
                              leagueCode={match.leagueCode}
                              matchName={match.name}
                              homeScore={homeScore}
                              awayScore={awayScore}
                            />
                          }
                        />
                        <Action.OpenInBrowser
                          title="View on Espn"
                          url={
                            match.links[0]?.href ||
                            `https://www.espn.com/soccer/scoreboard/_/league/${match.leagueCode}`
                          }
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          );
        } else {
          // Show all matches grouped by league
          return Object.entries(matchesByLeague).map(([leagueName, matches]) => (
            <List.Section key={leagueName} title={`${leagueName} - Live Matches`}>
              {matches.map((match) => {
                const homeTeam = match.competitions[0]?.competitors[1]?.team;
                const awayTeam = match.competitions[0]?.competitors[0]?.team;
                const homeScore = match.competitions[0]?.competitors[1]?.score || "0";
                const awayScore = match.competitions[0]?.competitors[0]?.score || "0";
                const status = match.competitions[0]?.status;
                const clock = status?.displayClock || status?.type?.detail || "Live";

                return (
                  <List.Item
                    key={match.id}
                    title={match.name}
                    subtitle={clock}
                    keywords={[
                      match.name,
                      homeTeam?.displayName || "",
                      awayTeam?.displayName || "",
                      homeTeam?.abbreviation || "",
                      awayTeam?.abbreviation || "",
                      match.leagueName || "",
                    ]}
                    icon={{
                      source: homeTeam?.logo || "Empty.png",
                    }}
                    accessories={[
                      {
                        text: {
                          value: `${awayTeam?.abbreviation || "Away"} ${awayScore} - ${homeScore} ${homeTeam?.abbreviation || "Home"}`,
                          color: Color.Green,
                        },
                        tooltip: "Live Score",
                      },
                      { icon: { source: Icon.Livestream, tintColor: Color.Green } },
                    ]}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="View Match Statistics"
                          icon={Icon.BarChart}
                          target={
                            <MatchStatistics
                              gameId={match.id}
                              leagueCode={match.leagueCode}
                              matchName={match.name}
                              homeScore={homeScore}
                              awayScore={awayScore}
                            />
                          }
                        />
                        <Action.OpenInBrowser
                          title="View on Espn"
                          url={
                            match.links[0]?.href ||
                            `https://www.espn.com/soccer/scoreboard/_/league/${match.leagueCode}`
                          }
                        />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          ));
        }
      })()}
    </List>
  );
}
