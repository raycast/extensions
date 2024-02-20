import { Color } from "@raycast/api";

export type Connection = {
  id: string;
  groupId: string;
  driver: string;
  name: string;
  isSocket: boolean;
  isOverSSH: boolean;
  ServerAddress: string;
  DatabaseHost: string;
  database: string;
  Driver: string;
  Environment: string | "local" | "development" | "testing" | "staging" | "production";
  icon: string;
  subtitle: string;
  version: number;
};

export type Group = {
  id: string;
  name: string;
  connections: Connection[];
};

type Environment = Connection["Environment"];
export const tintColors: { [key: Environment]: Color } = {
  local: Color.Green,
  development: Color.Blue,
  testing: Color.Purple,
  staging: Color.Orange,
  production: Color.Red,
};
