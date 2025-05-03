export type SyncRate = "0" | "86400000" | "604800000";

export type Preferences = {
  email: string;
  password: string;
  syncRate: SyncRate;
  hidePassword: boolean;
};
