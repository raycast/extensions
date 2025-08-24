import { useMemo } from "react";
import { List } from "@raycast/api";
import type { MatchDayLeague } from "@/types/match-day";

export type LeagueDropDownResult = "all" | number;

export function LeagueDropdown({
  leagues,
  onChange,
}: {
  leagues: MatchDayLeague[];
  onChange: (value: LeagueDropDownResult) => void;
}) {
  const modifiedLeagues = useMemo(() => {
    const leagueMap = new Map<number, MatchDayLeague>();
    leagues.forEach((league) => {
      const existingLeague = leagueMap.get(league.primaryId);
      if (existingLeague == null) {
        leagueMap.set(league.primaryId, league);
      }

      if (existingLeague?.isGroup === true && existingLeague?.parentLeagueName != null) {
        existingLeague.name = existingLeague.parentLeagueName;
      }
    });

    return Array.from(leagueMap.values());
  }, [leagues]);

  return (
    <List.Dropdown
      tooltip="Select a league"
      onChange={(value) => {
        if (value === "all") {
          onChange(value);
        } else {
          onChange(parseInt(value));
        }
      }}
    >
      <List.Dropdown.Item key={"all"} title={"All"} value="all" />
      {modifiedLeagues.map((league) => (
        <List.Dropdown.Item key={league.id} title={league.name} value={`${league.primaryId}`} />
      ))}
    </List.Dropdown>
  );
}
