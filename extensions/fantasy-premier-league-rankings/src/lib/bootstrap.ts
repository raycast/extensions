import type { Bootstrap, ElementType, Event, Player, Team } from "../api/types";

/** Lookup tables over bootstrap-static so commands don't repeat find() calls. */
export interface BootstrapIndex {
  players: Map<number, Player>;
  teams: Map<number, Team>;
  positions: Map<number, ElementType>;
  events: Event[];
  currentEvent: Event | undefined;
  nextEvent: Event | undefined;
}

export function indexBootstrap(bootstrap: Bootstrap): BootstrapIndex {
  return {
    players: new Map(bootstrap.elements.map((p) => [p.id, p])),
    teams: new Map(bootstrap.teams.map((t) => [t.id, t])),
    positions: new Map(bootstrap.element_types.map((e) => [e.id, e])),
    events: bootstrap.events,
    currentEvent: bootstrap.events.find((e) => e.is_current),
    nextEvent: bootstrap.events.find((e) => e.is_next),
  };
}

export const teamShort = (index: BootstrapIndex, teamId: number) => index.teams.get(teamId)?.short_name ?? "???";
export const teamName = (index: BootstrapIndex, teamId: number) => index.teams.get(teamId)?.name ?? "Unknown";
export const positionShort = (index: BootstrapIndex, typeId: number) =>
  index.positions.get(typeId)?.singular_name_short ?? "?";
export const playerName = (index: BootstrapIndex, playerId: number) =>
  index.players.get(playerId)?.web_name ?? `#${playerId}`;

export const playerPhotoUrl = (player: Player) =>
  `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.code}.png`;
export const teamBadgeUrl = (team: Team) =>
  `https://resources.premierleague.com/premierleague/badges/70/t${team.code}.png`;
