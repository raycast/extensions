export interface Breach {
  Name: string;
  Title: string;
  Domain: string;
  BreachDate: string;
  AddedDate: string;
  ModifiedDate: string;
  PwnCount: number;
  Description: string;
  LogoPath: string;
  DataClasses: string[];
  IsVerified: boolean;
  IsFabricated: boolean;
  IsSensitive: boolean;
  IsRetired: boolean;
  IsSpamList: boolean;
  IsMalware: boolean;
}

export interface EmailHistoryEntry {
  kind: "email";
  email: string;
  breaches: Breach[];
  timestamp: number;
}

export interface PasswordHistoryEntry {
  kind: "password";
  sha1Prefix: string;
  count: number;
  timestamp: number;
}

export type HistoryEntry = EmailHistoryEntry | PasswordHistoryEntry;
