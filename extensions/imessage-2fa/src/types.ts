export interface Message {
  guid: string;
  message_date: string;
  sender: string;
  text: string;
  source?: "email" | "imessage";
}

export type LookBackUnitType = "DAYS" | "HOURS" | "MINUTES";

export type EnabledSourcesType = "both" | "imessage" | "email";

export interface Preferences {
  enabledSources: EnabledSourcesType;
  defaultSource: MessageSource;
  lookBackUnit: LookBackUnitType;
  lookBackAmount: string;
  ignoreRead: boolean;
  emailSource: EmailSource;
  gmailClientId?: string;
}

export type SearchType = "all" | "code";

export type MessageSource = "all" | "imessage" | "email";
export type EmailSource = "applemail" | "gmail";
