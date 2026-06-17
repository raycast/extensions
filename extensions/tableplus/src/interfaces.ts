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
export const tintColors: { [key: Environment]: Color | string } = {
  local: Color.Green,
  development: "#4CE3DE",
  testing: Color.Orange,
  staging: Color.Blue,
  production: Color.Red,
};
