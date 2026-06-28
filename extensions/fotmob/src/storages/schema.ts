import type { League, Player, Team } from "./types";

export type Schema = {
  favoriteTeams: Team[];
  favoritePlayers: Player[];
  favoriteLeagues: League[];
};

export type SchemaKeys = keyof Schema;
export type SchemaValue<T extends SchemaKeys> = Schema[T];
