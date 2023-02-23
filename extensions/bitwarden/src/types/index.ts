/* Put types that you feel like they still don't deserve a file of their own here */

export type Preferences = {
  cliPath: string;
  clientId: string;
  clientSecret: string;
  fetchFavicons: boolean;
  serverUrl: string;
  serverCertsPath: string;
  repromptIgnoreDuration: string;
};

export type VaultStatus = "unauthenticated" | "locked" | "unlocked";
export type VaultState = {
  userEmail: string | null;
  status: VaultStatus;
  serverUrl: string | null;
};

export enum Object {
  Item = "item",
}
