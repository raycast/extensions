import { Icon, MenuBarExtra, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import getLiveMatches, { Game } from "./utils/getLiveMatches";

export default function Command() {
  const { allMatches, isLoading } = getLiveMatches();
  const [menuBarTitle, setMenuBarTitle] = useState("Select a Match");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const savedMatchId = await LocalStorage.getItem("selectedSoccerMatchMenubar");
      if (savedMatchId && typeof savedMatchId === "string") {
        setSelectedMatchId(savedMatchId);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedMatchId && allMatches.length > 0) {
      updateTitle(selectedMatchId);
    } else if (allMatches.length === 0 && !isLoading) {
      setMenuBarTitle("No Live Matches");
    } else if (!selectedMatchId) {
      setMenuBarTitle("Select a Match");
    }
  }, [allMatches, selectedMatchId, isLoading]);

  const updateTitle = async (matchId: string) => {
    const match = allMatches.find((m) => m.id === matchId);
    if (!match) return;

    const homeTeam = match.competitions[0]?.competitors[1]?.team;
    const awayTeam = match.competitions[0]?.competitors[0]?.team;
    const homeScore = match.competitions[0]?.competitors[1]?.score || "0";
    const awayScore = match.competitions[0]?.competitors[0]?.score || "0";
    const status = match.competitions[0]?.status;
    const clock = status?.displayClock || status?.type?.detail || "Live";

    let title = `${awayTeam?.abbreviation || "Away"} ${awayScore} - ${homeScore} ${homeTeam?.abbreviation || "Home"}`;

    if (clock) {
      title += ` ${clock}`;
    }

    setMenuBarTitle(title);
    setSelectedMatchId(matchId);
    await LocalStorage.setItem("selectedSoccerMatchMenubar", matchId);
  };

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

  // Create menu items grouped by league
  const menuItems: JSX.Element[] = [];

  Object.entries(matchesByLeague).forEach(([leagueName, matches]) => {
    menuItems.push(
      <MenuBarExtra.Section key={leagueName} title={leagueName}>
        {matches.map((match) => {
          const homeTeam = match.competitions[0]?.competitors[1]?.team;
          const awayTeam = match.competitions[0]?.competitors[0]?.team;
          const homeScore = match.competitions[0]?.competitors[1]?.score || "0";
          const awayScore = match.competitions[0]?.competitors[0]?.score || "0";
          const status = match.competitions[0]?.status;
          const clock = status?.displayClock || status?.type?.detail || "Live";

          const title = `${awayTeam?.abbreviation || "Away"} ${awayScore} - ${homeScore} ${homeTeam?.abbreviation || "Home"} (${clock})`;

          return (
            <MenuBarExtra.Item
              key={match.id}
              title={title}
              icon={homeTeam?.logo || Icon.GameController}
              tooltip={`Set ${match.name} as Title`}
              onAction={() => updateTitle(match.id)}
            />
          );
        })}
      </MenuBarExtra.Section>,
    );
  });

  // Clear selected match function
  function clearSetTitle() {
    LocalStorage.removeItem("selectedSoccerMatchMenubar");
    setSelectedMatchId(null);
    setMenuBarTitle("Select a Match");
  }

  // Add separator and clear option if there are matches
  if (allMatches.length > 0) {
    menuItems.push(<MenuBarExtra.Separator key="separator" />);
    menuItems.push(
      <MenuBarExtra.Item
        key="clear"
        title="Clear Selected Match"
        icon={Icon.ArrowClockwise}
        tooltip="Reset Menu Bar Title"
        onAction={clearSetTitle}
      />,
    );
  }

  return (
    <MenuBarExtra isLoading={isLoading} icon={Icon.Livestream} title={menuBarTitle}>
      {allMatches.length === 0 && !isLoading ? (
        <MenuBarExtra.Item title="No Live Matches" icon={Icon.Info} />
      ) : (
        <MenuBarExtra.Submenu title="Live Matches" icon={Icon.GameController}>
          {menuItems}
        </MenuBarExtra.Submenu>
      )}
    </MenuBarExtra>
  );
}
