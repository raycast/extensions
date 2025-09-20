import { Detail, List, Color, Icon, Action, ActionPanel, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import getPlayByPlayEvents from "../utils/getPlaybyPlay";
import sportInfo from "../utils/getSportInfo";
import TeamDetail from "../views/teamDetail";

export default function Plays({ gameId }: { gameId: string }) {
  const { playByPlayEventData, playByPlayLoading, playByPlayRevalidate } = getPlayByPlayEvents({ gameId });

  const currentLeague = sportInfo.getLeague();
  const currentSport = sportInfo.getSport();

  let period = "P";

  if (currentSport === "hockey") {
    period = "P";
  }

  if (currentSport === "basketball") {
    period = "Q";
  }

  if (currentSport === "football") {
    period = "Q";
  }

  if (currentSport === "baseball") {
    period = "Inning ";
  }

  const [currentPeriod, displaySelectPeriod] = useState(`${period}1`);
  useEffect(() => {
    async function loadStoredDropdown() {
      const storedValue = await LocalStorage.getItem("selectedPeriod");

      if (typeof storedValue === "string") {
        displaySelectPeriod(storedValue);
      } else {
        displaySelectPeriod(`${period}1`);
      }
    }

    loadStoredDropdown();
  }, []);

  const events = playByPlayEventData?.plays || [];
  const playByPlayEvents: JSX.Element[] = [];

  const awayTeamFull = playByPlayEventData?.boxscore?.teams?.[0]?.team?.displayName;
  const awayTeamId = playByPlayEventData?.boxscore?.teams?.[0]?.team?.id ?? "";
  const awayTeamLogo = playByPlayEventData?.boxscore?.teams?.[0]?.team.logo;

  const homeTeamFull = playByPlayEventData?.boxscore?.teams?.[1]?.team?.displayName;
  const homeTeamId = playByPlayEventData?.boxscore?.teams?.[1]?.team?.id ?? "";
  const homeTeamLogo = playByPlayEventData?.boxscore?.teams?.[1]?.team.logo;

  const leagueLogo = `https://a.espncdn.com/combiner/i?img=/i/teamlogos/leagues/500/${currentLeague}.png&w=100&h=100&transparent=true`;

  const getTeamLogo = (teamId: string) => {
    if (teamId === awayTeamId) {
      return awayTeamLogo;
    } else if (teamId === homeTeamId) {
      return homeTeamLogo;
    }
    return leagueLogo;
  };

  const filteredGames = events.filter((game) => `${period}${game?.period?.number}` === currentPeriod);

  filteredGames.forEach((game, index) => {
    let period;
    let periodNumber = `${game?.period?.number}`;
    let timeDisplay = game?.clock?.displayValue;

    if (currentSport === "hockey") {
      period = "P";
    }

    if (currentSport === "basketball") {
      period = "Q";
    }

    if (currentSport === "football") {
      period = "Q";
    }

    if (currentSport === "baseball") {
      timeDisplay = game?.period?.type ?? "Unknown";
      period = "";
      periodNumber = "";
    }

    const accessoryTitle = `${period}${periodNumber} ${timeDisplay}`;
    let accessoryIcon = Icon.Livestream;
    let accessoryColor = Color.SecondaryText;
    let accessoryTooltip = "Game Time";

    if (currentLeague === "nhl") {
      if (game.type.text === "Goal") {
        accessoryIcon = Icon.BullsEye;
        accessoryColor = Color.Green;
        accessoryTooltip = "Goal";
      }

      if (game.type.text === "Penalty") {
        accessoryIcon = Icon.Hourglass;
        accessoryColor = Color.Orange;
        accessoryTooltip = "Penalty";
      }

      if (game.text?.includes("Fighting")) {
        accessoryIcon = Icon.MinusCircle;
        accessoryColor = Color.Red;
        accessoryTooltip = "Fight";
      }

      if (game.text?.includes("saved")) {
        accessoryIcon = Icon.BullsEyeMissed;
        accessoryColor = Color.Blue;
        accessoryTooltip = "Save";
      }
    }

    if (currentSport === "basketball") {
      if (game.text?.includes("makes free throw")) {
        accessoryIcon = Icon.BullsEye;
        accessoryColor = Color.Green;
        accessoryTooltip = "Free Throw";
      }

      if (game.text?.includes("misses free throw")) {
        accessoryIcon = Icon.BullsEyeMissed;
        accessoryColor = Color.Orange;
        accessoryTooltip = "Free Throw";
      }

      if (game.type.text === "Substitution") {
        accessoryIcon = Icon.Switch;
        accessoryColor = Color.Yellow;
        accessoryTooltip = "Substitution";
      }

      if (game.type.text?.includes("Timeout")) {
        accessoryIcon = Icon.Hourglass;
        accessoryColor = Color.Blue;
        accessoryTooltip = "Timeout";
      }

      if (game.type.text?.includes("Foul")) {
        accessoryIcon = Icon.MinusCircle;
        accessoryColor = Color.Red;
        accessoryTooltip = "Foul";
      }
    }

    if (currentLeague === "mlb") {
      if (game.type.text === "Play Result") {
        accessoryIcon = Icon.BullsEye;
        accessoryColor = Color.Green;
        accessoryTooltip = "Play Result";
      }

      if (game.type.text === "Strike Swinging") {
        accessoryIcon = Icon.BullsEyeMissed;
        accessoryColor = Color.Orange;
        accessoryTooltip = "Strike Swinging";
      }

      if (game.type.text === "Strike Looking") {
        accessoryIcon = Icon.Eye;
        accessoryColor = Color.Blue;
        accessoryTooltip = "Strike Looking";
      }

      if (game.type.text === "Foul Ball") {
        accessoryIcon = Icon.XMarkCircle;
        accessoryColor = Color.Yellow;
        accessoryTooltip = "Foul Ball";
      }
    }

    if (
      game.type.text.includes("Period Start") ||
      game.type.text.includes("Start Period") ||
      game.type.text.includes("Start Inning")
    ) {
      accessoryIcon = Icon.Play;
      accessoryColor = Color.PrimaryText;
    }

    if (
      game.type.text.includes("Period End") ||
      game.type.text.includes("Shootout End") ||
      game.type.text.includes("End Period") ||
      game.type.text.includes("End Inning") ||
      game.type.text.includes("End of Game") ||
      game.type.text.includes("End Game")
    ) {
      accessoryIcon = Icon.Flag;
      accessoryColor = Color.PrimaryText;
    }

    const teamId = game?.team?.id;
    const currentTeam = getTeamLogo(teamId);

    playByPlayEvents.push(
      <List.Item
        key={index}
        title={game.text ?? "No Description Available"}
        icon={currentTeam}
        subtitle={game.type.text}
        accessories={[
          {
            text: { value: `${accessoryTitle ?? "No time found"}`, color: accessoryColor },
            tooltip: accessoryTooltip,
          },
          { icon: { source: accessoryIcon, tintColor: accessoryColor } },
        ]}
        actions={
          <ActionPanel>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={playByPlayRevalidate}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            {currentLeague !== "f1" && (
              <>
                <Action.Push
                  title={`View ${awayTeamFull ?? "Away"} Team Details`}
                  icon={Icon.List}
                  target={<TeamDetail teamId={awayTeamId} />}
                />
                <Action.Push
                  title={`View ${homeTeamFull ?? "Home"} Team Details`}
                  icon={Icon.List}
                  target={<TeamDetail teamId={homeTeamId} />}
                />
              </>
            )}
          </ActionPanel>
        }
      />,
    );
  });

  playByPlayEvents.reverse();

  if (playByPlayLoading) {
    return <Detail isLoading={true} />;
  }

  if (!playByPlayEventData) {
    return <Detail markdown="No data found." />;
  }

  const uniquePeriods = Array.from(new Set(events.map((event) => event?.period?.number).filter(Boolean)));

  return (
    <List
      searchBarPlaceholder="Search for your favorite team"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort By"
          onChange={async (newValue) => {
            displaySelectPeriod(newValue);
            await LocalStorage.setItem("selectedPeriod", newValue);
          }}
          value={currentPeriod}
          defaultValue={`${period}1`}
        >
          {uniquePeriods.map((periodNumber) => (
            <List.Dropdown.Item
              key={periodNumber}
              title={`${period}${periodNumber}`}
              value={`${period}${periodNumber}`}
            />
          ))}
        </List.Dropdown>
      }
      isLoading={playByPlayLoading}
    >
      <>
        <List.Section
          title={`Play by Play for ${currentPeriod}`}
          subtitle={`${playByPlayEvents.length} Play${playByPlayEvents.length !== 1 ? "s" : ""}`}
        >
          {playByPlayEvents.length > 0 ? playByPlayEvents : <List.Item title="No plays for this period." />}
        </List.Section>
      </>
    </List>
  );
}
