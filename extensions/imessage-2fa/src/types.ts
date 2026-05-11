export interface Message {
  guid: string;
  message_date: string;
  sender: string;
  text: string;
  displayText: string;
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
  enableVerificationLinks: boolean;
}

export type SearchType = "all" | "code";

export type MessageSource = "all" | "imessage" | "email";
export type EmailSource = "applemail" | "gmail";

export interface VerificationLink {
  url: string;
  type: "verification" | "sign-in";
  messageId: string;
  source: "email" | "imessage";
  messageDate: string;
  sender: string;
  displayText: string;
}
