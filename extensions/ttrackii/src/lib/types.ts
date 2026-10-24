export type Workspace = {
  id: string;
  kind: "personal" | "team";
  name: string;
  writable: boolean;
};
export type Session = {
  user: { id: string; name: string | null };
  workspaces: Workspace[];
  defaultCurrency?: string;
};
export type Project = {
  id: string;
  name: string;
  clientId: string | null;
  color?: string | null;
  billingRateMinor?: number | null;
  billingCurrency?: string | null;
};
export type Tag = Project & { projectId: string | null };
export type Resources = { projects: Project[]; tags: Tag[] };
export type Entry = {
  id: string;
  taskName: string;
  projectId?: string | null;
  projectName: string | null;
  tagId?: string | null;
  tagName: string | null;
  tagIds?: string[];
  tagNames?: string[];
  projectColor?: string | null;
  startTime: number;
  endTime: number | null;
  durationMs: number;
  isRunning: boolean;
  workspaceId?: string;
  workspaceName?: string;
  isBillable?: boolean;
  billingRateMinor?: number | null;
  billingCurrency?: string | null;
  billingSource?: "none" | "client" | "project" | "tag" | "custom";
};
/** `default` follows the first tag with a rate, then the project. */
export type Billing =
  | { mode: "default" }
  | { mode: "none" }
  | { mode: "custom"; billingRateMinor: number; billingCurrency: string };
export type EntriesPage = { entries: Entry[]; nextCursor: string | null };
export type Group = { name: string; durationMs: number; entries: number };
export type Timer = {
  running: boolean;
  entry: Entry | null;
  asOf: string;
  elapsedMs: number;
};
export type Report = {
  summary: {
    totalDurationMs: number;
    entryCount: number;
    runningEntryCount: number;
    byProject?: Group[];
    byTag?: Group[];
    byTask?: Group[];
    byDay?: { date: string; durationMs: number; entries: number }[];
    billableTotals?: { currency: string; amountMinor: number }[];
  };
  entries: Entry[];
  nextCursor: string | null;
};
export type DeviceCode = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  expires_in: number;
  interval?: number;
};
export type TokenResponse = { access_token: string; expires_in?: number };
