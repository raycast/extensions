import { Detail, List, Color, Icon, Action, ActionPanel } from "@raycast/api";
import getTeamStandings from "../utils/getStandings";
import sportInfo from "../utils/getSportInfo";
import RosterDetail from "../views/roster";
import TeamSchedule from "../views/teamSchedule";
import TeamDetail from "../views/teamDetail";

export default function DisplayTeamStandings() {
  const { standingsLoading, standingsData, standingsRevalidate } = getTeamStandings();
  const currentLeague = sportInfo.getLeague();
  const currentSport = sportInfo.getSport();

  const items1 = standingsData?.children?.[0]?.standings?.entries || [];
  const items2 = standingsData?.children?.[1]?.standings?.entries || [];

  const findStat = (stats: { name: string; displayValue: string }[], key: string): string =>
    stats?.find((stat) => stat.name === key)?.displayValue ?? "0";

  const findRecord = (stats: { name: string; summary: string }[], key: string): string =>
    stats?.find((stat) => stat.name === key)?.summary ?? "0-0";

  const conference1 = items1.map((team1, index) => {
    let playoffPosition = 0;

    let tagColor;
    let tagIcon;
    let tagTooltip;

    let stat1;
    let stat2;
    let stat3;
    let stat4;
    let stat5;

    if (currentLeague === "nhl") {
      stat1 = `${findStat(team1?.stats, "gamesPlayed")} GP |`;
      stat2 = `${findRecord(team1?.stats, "overall")} |`;
      stat3 = `${findStat(team1?.stats, "points")} pts |`;
      stat4 = `GF: ${findStat(team1?.stats, "pointsFor")} |`;
      stat5 = `GA: ${findStat(team1?.stats, "pointsAgainst")}`;
      playoffPosition = Number(findStat(team1?.stats, "playoffSeed"));
    }

    if (currentLeague === "nba") {
      stat1 = `${findRecord(team1?.stats, "overall")} |`;
      stat2 = `Pct: ${(Number(findStat(team1?.stats, "winPercent")) * 100).toFixed(1)}% |`;
      stat3 = `PF: ${findStat(team1?.stats, "pointsFor")} |`;
      stat4 = `PA: ${findStat(team1?.stats, "pointsAgainst")} |`;
      stat5 = `Dif: ${findStat(team1?.stats, "differential")}`;
      playoffPosition = Number(findStat(team1?.stats, "playoffSeed")) || 0;
    }

    if (currentLeague === "wnba") {
      stat1 = `${findRecord(team1?.stats, "overall")} |`;
      stat2 = `Pct: ${(Number(findStat(team1?.stats, "leagueWinPercent")) * 100).toFixed(1)}% |`;
      stat3 = `PF: ${findStat(team1?.stats, "pointsFor")} |`;
      stat4 = `PA: ${findStat(team1?.stats, "pointsAgainst")} |`;
      stat5 = `Dif: ${findStat(team1?.stats, "differential")}`;
      playoffPosition = Number(findStat(team1?.stats, "playoffSeed")) || 0;
    }

    if (currentLeague === "nfl") {
      stat1 = `${findRecord(team1?.stats, "overall")} |`;
      stat2 = `Pct: ${(Number(findStat(team1?.stats, "winPercent")) * 100).toFixed(1)}% |`;
      stat3 = `PF: ${findStat(team1?.stats, "pointsFor")} |`;
      stat4 = `PA: ${findStat(team1?.stats, "pointsAgainst")} |`;
      stat5 = `Dif: ${findStat(team1?.stats, "differential")}`;
      playoffPosition = Number(findStat(team1?.stats, "playoffSeed")) || 0;
    }

    if (currentLeague === "mlb") {
      stat1 = `${findStat(team1?.stats, "gamesPlayed")} GP |`;
      stat2 = `${findRecord(team1?.stats, "overall")} |`;
      stat3 = `Pct: ${(Number(findStat(team1?.stats, "winPercent")) * 100).toFixed(1)}% |`;
      stat4 = `PF: ${findStat(team1?.stats, "pointsFor")} |`;
      stat5 = `PA: ${findStat(team1?.stats, "pointsAgainst")}`;
      playoffPosition = Number(findStat(team1?.stats, "playoffSeed")) || 0;
    }

    const flagSrc = `${team1?.athlete?.flag?.href}`;

    if (currentLeague === "f1") {
      stat1 = `${findStat(team1?.stats, "championshipPts")} pts`;
      stat2 = "";
      stat3 = "";
      stat4 = "";
      stat5 = "";
      playoffPosition = Number(findStat(team1?.stats, "rank")) || 0;
    }

    if (currentSport === "soccer") {
      stat1 = `${findStat(team1?.stats, "gamesPlayed")} GP |`;
      stat2 = `${findRecord(team1?.stats, "overall")} |`;
      stat3 = `${findStat(team1?.stats, "points")} pts |`;
      stat4 = `GF: ${findStat(team1?.stats, "pointsFor")} |`;
      stat5 = `GA: ${findStat(team1?.stats, "pointsAgainst")}`;
      playoffPosition = Number(findStat(team1?.stats, "rank"));
    }

    if (playoffPosition === 1) {
      tagColor = Color.Yellow;
      tagIcon = Icon.Trophy;
      tagTooltip = "1st in Conference";
    } else if (playoffPosition >= 2 && playoffPosition <= 8) {
      tagColor = Color.Green;
      tagIcon = Icon.Leaderboard;
      tagTooltip = "Playoff Contender";
    } else if (playoffPosition >= 9 && playoffPosition <= 15) {
      tagColor = Color.Orange;
      tagIcon = Icon.XMarkCircle;
      tagTooltip = "Not in Playoffs";
    } else if (playoffPosition === 16) {
      tagColor = Color.Red;
      tagIcon = Icon.Xmark;
      tagTooltip = "Last in Conference";
    } else {
      tagColor = Color.SecondaryText;
    }

    if (currentLeague === "nba") {
      if (playoffPosition === 1) {
        tagColor = Color.Yellow;
        tagIcon = Icon.Trophy;
        tagTooltip = "1st in Conference";
      } else if (playoffPosition >= 2 && playoffPosition <= 8) {
        tagColor = Color.Green;
        tagIcon = Icon.Leaderboard;
        tagTooltip = "Playoff Contender";
      } else if (playoffPosition >= 9 && playoffPosition <= 14) {
        tagColor = Color.Orange;
        tagIcon = Icon.XMarkCircle;
        tagTooltip = "Not in Playoffs";
      } else if (playoffPosition === 15) {
        tagColor = Color.Red;
        tagIcon = Icon.Xmark;
        tagTooltip = "Last in Conference";
      } else {
        tagColor = Color.SecondaryText;
      }
    }

    if (currentLeague === "wnba") {
      if (playoffPosition === 1) {
        tagColor = Color.Yellow;
        tagIcon = Icon.Trophy;
        tagTooltip = "1st in Conference";
      } else if (playoffPosition >= 2 && playoffPosition <= 4) {
        tagColor = Color.Green;
        tagIcon = Icon.Leaderboard;
        tagTooltip = "Playoff Contender";
      } else if (playoffPosition >= 4 && playoffPosition <= 5) {
        tagColor = Color.Orange;
        tagIcon = Icon.XMarkCircle;
        tagTooltip = "Not in Playoffs";
      } else if (playoffPosition === 6) {
        tagColor = Color.Red;
        tagIcon = Icon.Xmark;
        tagTooltip = "Last in Conference";
      } else {
        tagColor = Color.SecondaryText;
      }
    }

    if (currentSport === "football") {
      if (playoffPosition === 1) {
        tagColor = Color.Yellow;
        tagIcon = Icon.Trophy;
        tagTooltip = "1st in Conference";
      } else if (playoffPosition >= 2 && playoffPosition <= 7) {
        tagColor = Color.Green;
        tagIcon = Icon.Leaderboard;
        tagTooltip = "Playoff Contender";
      } else if (playoffPosition >= 8 && playoffPosition <= 15) {
        tagColor = Color.Orange;
        tagIcon = Icon.XMarkCircle;
        tagTooltip = "Not in Playoffs";
      } else if (playoffPosition === 16) {
        tagColor = Color.Red;
        tagIcon = Icon.Xmark;
        tagTooltip = "Last in Conference";
      } else {
        tagColor = Color.SecondaryText;
      }
    }

    if (currentSport === "baseball") {
      if (playoffPosition === 1) {
        tagColor = Color.Yellow;
        tagIcon = Icon.Trophy;
        tagTooltip = "1st in Conference";
      } else if (playoffPosition >= 2 && playoffPosition <= 6) {
        tagColor = Color.Green;
        tagIcon = Icon.Leaderboard;
        tagTooltip = "Playoff Contender";
      } else if (playoffPosition >= 7 && playoffPosition <= 14) {
        tagColor = Color.Orange;
        tagIcon = Icon.XMarkCircle;
        tagTooltip = "Not in Playoffs";
      } else if (playoffPosition === 15) {
        tagColor = Color.Red;
        tagIcon = Icon.Xmark;
        tagTooltip = "Last in Conference";
      } else {
        tagColor = Color.SecondaryText;
      }
    }

    if (currentLeague === "f1") {
      if (playoffPosition === 1) {
        tagColor = Color.Yellow;
        tagIcon = Icon.Trophy;
        tagTooltip = "1st";
      } else if (playoffPosition >= 2) {
        tagColor = Color.Green;
        tagIcon = Icon.Leaderboard;
        tagTooltip = "";
      } else {
        tagColor = Color.SecondaryText;
        tagTooltip = "";
      }
    }

    if (currentSport === "soccer") {
      if (playoffPosition === 1) {
        tagColor = Color.Yellow;
        tagIcon = Icon.Trophy;
      } else if (playoffPosition >= 2) {
        tagColor = Color.Green;
        tagIcon = Icon.Leaderboard;
      } else {
        tagColor = Color.SecondaryText;
      }
    }

    return (
      <List.Item
        key={index}
        title={`${team1?.team?.displayName ?? team1?.athlete?.displayName ?? "Unknown"}`}
        accessories={[
          {
            text: `${stat1} ${stat2} ${stat3} ${stat4} ${stat5}`,
          },
          {
            tag: { value: `${playoffPosition}`, color: tagColor },
            icon: tagIcon,
            tooltip: tagTooltip,
          },
        ]}
        icon={{
          source:
            team1?.team?.logos?.[0]?.href ??
            flagSrc ??
            `https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/${currentLeague}.png&w=100&h=100&transparent=true`,
        }}
        actions={
          <ActionPanel>
            {currentLeague !== "f1" && (
              <>
                <Action.Push
                  title={`View ${team1?.team?.displayName ?? "Team"} Details`}
                  icon={Icon.List}
                  target={<TeamDetail teamId={team1?.team?.id} />}
                />
                <Action.Push
                  title={`View ${team1?.team?.displayName ?? "Team"} Roster`}
                  icon={Icon.TwoPeople}
                  target={<RosterDetail teamId={team1?.team?.id} />}
                />
                <Action.Push
                  title={`View ${team1?.team?.displayName ?? "Team"} Schedule`}
                  icon={Icon.Calendar}
                  target={<TeamSchedule teamId={team1?.team?.id} />}
                />
              </>
            )}

            {currentLeague === "f1" && (
              <Action.OpenInBrowser title={`View F1 on ESPN`} url={`${`https://www.espn.com/${currentLeague}`}`} />
            )}

            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={standingsRevalidate}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            ></Action>
          </ActionPanel>
        }
      />
    );
  });

  const conference2 = items2.map((team2, index) => {
    let playoffPosition = 0;

    let tagColor;
    let tagIcon;
    let tagTooltip;

    let stat1;
    let stat2;
    let stat3;
    let stat4;
    let stat5;

    if (currentLeague === "nhl") {
      stat1 = `${findStat(team2?.stats, "gamesPlayed")} GP |`;
      stat2 = `${findRecord(team2?.stats, "overall")} |`;
      stat3 = `${findStat(team2?.stats, "points")} pts |`;
      stat4 = `GF: ${findStat(team2?.stats, "pointsFor")} |`;
      stat5 = `GA: ${findStat(team2?.stats, "pointsAgainst")}`;
      playoffPosition = Number(findStat(team2?.stats, "playoffSeed"));
    }

    if (currentLeague === "nba") {
      stat1 = `${findRecord(team2?.stats, "overall")} |`;
      stat2 = `Pct: ${(Number(findStat(team2?.stats, "winPercent")) * 100).toFixed(1)}% |`;
      stat3 = `PF: ${findStat(team2?.stats, "pointsFor")} |`;
      stat4 = `PA: ${findStat(team2?.stats, "pointsAgainst")} |`;
      stat5 = `Dif: ${findStat(team2?.stats, "differential")}`;
      playoffPosition = Number(findStat(team2?.stats, "playoffSeed")) || 0;
    }

    if (currentLeague === "wnba") {
      stat1 = `${findRecord(team2?.stats, "overall")} |`;
      stat2 = `Pct: ${(Number(findStat(team2?.stats, "leagueWinPercent")) * 100).toFixed(1)}% |`;
      stat3 = `PF: ${findStat(team2?.stats, "pointsFor")} |`;
      stat4 = `PA: ${findStat(team2?.stats, "pointsAgainst")} |`;
      stat5 = `Dif: ${findStat(team2?.stats, "differential")}`;
      playoffPosition = Number(findStat(team2?.stats, "playoffSeed")) || 0;
    }

    if (currentLeague === "nfl") {
      stat1 = `${findRecord(team2?.stats, "overall")} |`;
      stat2 = `Pct: ${(Number(findStat(team2?.stats, "winPercent")) * 100).toFixed(1)}% |`;
      stat3 = `PF: ${findStat(team2?.stats, "pointsFor")} |`;
      stat4 = `PA: ${findStat(team2?.stats, "pointsAgainst")} |`;
      stat5 = `Dif: ${findStat(team2?.stats, "differential")}`;
      playoffPosition = Number(findStat(team2?.stats, "playoffSeed")) || 0;
    }

    if (currentLeague === "mlb") {
      stat1 = `${findStat(team2?.stats, "gamesPlayed")} GP |`;
      stat2 = `${findRecord(team2?.stats, "overall")} |`;
      stat3 = `Pct: ${(Number(findStat(team2?.stats, "winPercent")) * 100).toFixed(1)}% |`;
      stat4 = `PF: ${findStat(team2?.stats, "pointsFor")} |`;
      stat5 = `PA: ${findStat(team2?.stats, "pointsAgainst")}`;
      playoffPosition = Number(findStat(team2?.stats, "playoffSeed")) || 0;
    }

    if (currentLeague === "f1") {
      stat1 = `${findStat(team2?.stats, "points")} pts`;
      stat2 = "";
      stat3 = "";
      stat4 = "";
      stat5 = "";
      playoffPosition = Number(findStat(team2?.stats, "rank")) || 0;
    }

    if (playoffPosition === 1) {
      tagColor = Color.Yellow;
      tagIcon = Icon.Trophy;
      tagTooltip = "1st in Conference";
    } else if (playoffPosition >= 2 && playoffPosition <= 8) {
      tagColor = Color.Green;
      tagIcon = Icon.Leaderboard;
      tagTooltip = "Playoff Contender";
    } else if (playoffPosition >= 9 && playoffPosition <= 15) {
      tagColor = Color.Orange;
      tagIcon = Icon.XMarkCircle;
      tagTooltip = "Not in Playoffs";
    } else if (playoffPosition === 16) {
      tagColor = Color.Red;
      tagIcon = Icon.Xmark;
      tagTooltip = "Last in Conference";
    } else {
      tagColor = Color.SecondaryText;
    }

    if (currentLeague === "nba") {
      if (playoffPosition === 1) {
        tagColor = Color.Yellow;
        tagIcon = Icon.Trophy;
        tagTooltip = "1st in Conference";
      } else if (playoffPosition >= 2 && playoffPosition <= 8) {
        tagColor = Color.Green;
        tagIcon = Icon.Leaderboard;
        tagTooltip = "Playoff Contender";
      } else if (playoffPosition >= 9 && playoffPosition <= 14) {
        tagColor = Color.Orange;
        tagIcon = Icon.XMarkCircle;
        tagTooltip = "Not in Playoffs";
      } else if (playoffPosition === 15) {
        tagColor = Color.Red;
        tagIcon = Icon.Xmark;
        tagTooltip = "Last in Conference";
      } else {
        tagColor = Color.SecondaryText;
      }
    }

    if (currentLeague === "wnba") {
      if (playoffPosition === 1) {
        tagColor = Color.Yellow;
        tagIcon = Icon.Trophy;
        tagTooltip = "1st in Conference";
      } else if (playoffPosition >= 2 && playoffPosition <= 4) {
        tagColor = Color.Green;
        tagIcon = Icon.Leaderboard;
        tagTooltip = "Playoff Contender";
      } else if (playoffPosition >= 4 && playoffPosition <= 5) {
        tagColor = Color.Orange;
        tagIcon = Icon.XMarkCircle;
        tagTooltip = "Not in Playoffs";
      } else if (playoffPosition === 6) {
        tagColor = Color.Red;
        tagIcon = Icon.Xmark;
        tagTooltip = "Last in Conference";
      } else {
        tagColor = Color.SecondaryText;
      }
    }

    if (currentSport === "football") {
      if (playoffPosition === 1) {
        tagColor = Color.Yellow;
        tagIcon = Icon.Trophy;
        tagTooltip = "1st in Conference";
      } else if (playoffPosition >= 2 && playoffPosition <= 7) {
        tagColor = Color.Green;
        tagIcon = Icon.Leaderboard;
        tagTooltip = "Playoff Contender";
      } else if (playoffPosition >= 8 && playoffPosition <= 15) {
        tagColor = Color.Orange;
        tagIcon = Icon.XMarkCircle;
        tagTooltip = "Not in Playoffs";
      } else if (playoffPosition === 16) {
        tagColor = Color.Red;
        tagIcon = Icon.Xmark;
        tagTooltip = "Last in Conference";
      } else {
        tagColor = Color.SecondaryText;
      }
    }

    if (currentSport === "baseball") {
      if (playoffPosition === 1) {
        tagColor = Color.Yellow;
        tagIcon = Icon.Trophy;
        tagTooltip = "1st in Conference";
      } else if (playoffPosition >= 2 && playoffPosition <= 6) {
        tagColor = Color.Green;
        tagIcon = Icon.Leaderboard;
        tagTooltip = "Playoff Contender";
      } else if (playoffPosition >= 7 && playoffPosition <= 14) {
        tagColor = Color.Orange;
        tagIcon = Icon.XMarkCircle;
        tagTooltip = "Not in Playoffs";
      } else if (playoffPosition === 15) {
        tagColor = Color.Red;
        tagIcon = Icon.Xmark;
        tagTooltip = "Last in Conference";
      } else {
        tagColor = Color.SecondaryText;
      }
    }

    if (currentLeague === "f1") {
      if (playoffPosition === 1) {
        tagColor = Color.Yellow;
        tagIcon = Icon.Trophy;
        tagTooltip = "1st";
      } else if (playoffPosition >= 2) {
        tagColor = Color.Green;
        tagIcon = Icon.Leaderboard;
        tagTooltip = "";
      } else {
        tagColor = Color.SecondaryText;
        tagTooltip = "";
      }
    }

    return (
      <List.Item
        key={index}
        title={`${team2?.team?.displayName ?? "Unknown"}`}
        accessories={[
          {
            text: `${stat1} ${stat2} ${stat3} ${stat4} ${stat5}`,
          },
          {
            tag: { value: `${playoffPosition}`, color: tagColor },
            icon: tagIcon,
            tooltip: tagTooltip,
          },
        ]}
        icon={{
          source:
            team2?.team?.logos?.[0]?.href ??
            `https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/${currentLeague}.png`,
        }}
        actions={
          <ActionPanel>
            {currentLeague !== "f1" && (
              <>
                <Action.Push
                  title={`View ${team2?.team?.displayName ?? "Team"} Details`}
                  icon={Icon.List}
                  target={<TeamDetail teamId={team2?.team?.id} />}
                />
                <Action.Push
                  title={`View ${team2?.team?.displayName ?? "Team"} Roster`}
                  icon={Icon.TwoPeople}
                  target={<RosterDetail teamId={team2?.team?.id} />}
                />
                <Action.Push
                  title={`View ${team2?.team?.displayName ?? "Team"} Schedule`}
                  icon={Icon.Calendar}
                  target={<TeamSchedule teamId={team2?.team?.id} />}
                />
              </>
            )}

            {currentLeague === "f1" && (
              <Action.OpenInBrowser title={`View F1 on ESPN`} url={`${`https://www.espn.com/${currentLeague}`}`} />
            )}

            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={standingsRevalidate}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            ></Action>
          </ActionPanel>
        }
      />
    );
  });

  if (standingsLoading) {
    return <Detail isLoading={true} />;
  }

  const conferenceTitle1 = standingsData?.children[0]?.name ?? "Conference 1";
  let conferenceTitle2 = standingsData?.children[1]?.name ?? "Conference 2";

  if (currentSport === "Soccer") {
    conferenceTitle2 = "";
  }

  if (!standingsData) {
    return <List.EmptyView icon="Empty.png" title="No Results Found" />;
  }

  return (
    <>
      <List.Section title={`${conferenceTitle1}`}>{conference1}</List.Section>
      <List.Section title={`${conferenceTitle2}`}>{conference2}</List.Section>
    </>
  );
}
