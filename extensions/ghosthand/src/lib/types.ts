import type { components } from "./api.generated";

export type Schemas = components["schemas"];
export type Phone = Schemas["PhoneStatus"];
export type PhoneOverview = Schemas["PhoneOverview"];
export type Lease = Schemas["Lease"];
export type ScreenText = Schemas["ScreenText"];
export type TaskResult = Schemas["TaskResult"];
export type QuickAction =
  | { kind: "home" | "lock" | "enter" }
  | { kind: "scroll"; direction: "up" | "down" }
  | { kind: "mute"; muted: boolean }
  | { kind: "type"; text: string }
  | { kind: "tap"; text: string };

export type TaskUpdate = { text: string; progress: string };
