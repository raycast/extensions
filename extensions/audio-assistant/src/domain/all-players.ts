import type { Player } from "./model";

/** Compose All from fresh session players, keeping native row identity across section moves. */
export function allPlayers(players: Player[], activeId: string | undefined, query: string, outputError?: string) {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = (player: Player) =>
    words.every((word) => `${player.name} ${player.provider}`.toLocaleLowerCase().includes(word));
  const saved = players.find((player) => player.id === activeId);
  const active = !outputError && saved?.available && matches(saved) ? saved : undefined;
  const status =
    outputError ??
    (activeId && !saved?.available ? "Your active player is unavailable. Choose another player." : undefined);
  return {
    active,
    status,
    others: players.filter((player) => player.available && matches(player) && player.id !== active?.id),
  };
}
