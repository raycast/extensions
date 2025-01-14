export interface Message {
  guid: string;
  message_date: string;
  sender: string;
  text: string;
  source?: MessageSource;
}

export enum LookBackUnitType {
  DAYS = "DAYS",
  HOURS = "HOURS",
  MINUTES = "MINUTES",
}

export type EnabledSourcesType = "both" | "imessage" | "email";

export interface Preferences {
  lookBackUnit: LookBackUnitType;
  lookBackAmount?: string;
  ignoreRead: boolean;
  defaultSource?: MessageSource;
  enabledSources: EnabledSourcesType;
}

export type SearchType = "all" | "code";

export type MessageSource = "imessage" | "email" | "all";
