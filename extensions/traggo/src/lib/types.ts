import { TimersQuery } from "../graphql/timers.hook";

export type Preferences = {
  url: string;
  username: string;
  password: string;
};

export type Timer = NonNullable<TimersQuery["timers"]>[number];

export type Tag = { id: string; key: string; value: string; color: string };
