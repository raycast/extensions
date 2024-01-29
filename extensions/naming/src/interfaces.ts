import { AI } from "@raycast/api";

export interface Name {
  name: string;
  reason: string;
}

export interface Config {
  model: AI.Model;
  locale: string;
}

export type Mode = "VIEW" | "SEARCH";
