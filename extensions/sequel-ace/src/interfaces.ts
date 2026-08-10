import { Color } from "@raycast/api";

export type Connection = {
  id: string;
  colorIndex: number;
  name: string;
  databaseHost: string;
  database: string;
};

export type Group = {
  id: string;
  name: string;
  connections: Connection[];
};

export interface Preferences {
  path?: string;
  showConnectionDriver?: boolean;
  searchByGroupName?: boolean;
}

type Environment = string | "local" | "development" | "testing" | "staging" | "production";
export const tintColors: { [key: Environment]: Color } = {
  local: Color.Green,
  development: Color.Blue,
  testing: Color.Purple,
  staging: Color.Orange,
  production: Color.Red,
};

export const tintColorsIndex: { [key: number]: Color } = {
  0: Color.Red,
  1: Color.Orange,
  2: Color.Yellow,
  3: Color.Green,
  4: Color.Blue,
  5: Color.Purple,
  6: Color.SecondaryText,
};

export const enviromentIndex: { [key: number]: Environment } = {
  0: "production",
  1: "staging",
  3: "local",
  4: "development",
  5: "testing",
};
