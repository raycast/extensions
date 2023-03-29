export interface Message {
  guid: string;
  message_date: string;
  sender: string;
  text: string;
}

export interface Preferences {
  lookBackDays?: string;
}

export type SearchType = "all" | "code";
