export interface Message {
  guid: string;
  message_date: string;
  sender: string;
  text: string;
}

export enum LookBackUnitType {
  DAYS = "DAYS",
  HOURS = "HOURS",
  MINUTES = "MINUTES",
}

export interface Preferences {
  lookBackUnit: LookBackUnitType;
  lookBackAmount?: string;
  ignoreRead: boolean;
}

export type SearchType = "all" | "code";
