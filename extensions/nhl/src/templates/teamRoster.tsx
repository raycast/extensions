import React from "react";
import { List } from "@raycast/api";
import { PlayerOnIce } from "../utils/types";
import { getNHL } from "../utils/nhlData";
import Unresponsive from "./unresponsive";
import PlayerListItem from "./playerListItem";
import { getLanguageKey } from "../utils/helpers";
import { playerTitleStrings } from "../utils/translations";

const lang = getLanguageKey();

type RosterResponse = {
  data: {
    forwards: PlayerOnIce[];
    defensemen: PlayerOnIce[];
    goalies: PlayerOnIce[];
  };
  isLoading: boolean;
};

type PlayerSectionProps = {
  title: string;
  players: PlayerOnIce[];
};

const PlayerSection = ({ title, players }: PlayerSectionProps) => {
  if (!Array.isArray(players) || players.length === 0) {
    return null;
  }

  return (
    <List.Section title={title}>
      {players.map((player) => (
        <PlayerListItem key={player.id} player={player} />
      ))}
    </List.Section>
  );
};

export default function TeamRoster({ team, season }: { team: string; season: number }) {
  const roster = getNHL(`roster/${team}/${season}`) as RosterResponse;

  if (roster.isLoading) return <List isLoading={true} />;
  if (!roster.data || !roster.data.forwards) return <Unresponsive />;

  return (
    <List>
      <PlayerSection title={playerTitleStrings.forwards[lang]} players={roster.data.forwards} />
      <PlayerSection title={playerTitleStrings.defensemen[lang]} players={roster.data.defensemen} />
      <PlayerSection title={playerTitleStrings.goalies[lang]} players={roster.data.goalies} />
    </List>
  );
}
