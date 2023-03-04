/* Put types that you feel like they still don't deserve a file of their own here */

import { ERRORS } from "~/constants/general";

export type Preferences = {
  cliPath: string;
  clientId: string;
  clientSecret: string;
  fetchFavicons: boolean;
  serverUrl: string;
  serverCertsPath: string;
  repromptIgnoreDuration: string;
  generatePasswordQuickAction: "paste" | "copy" | "copyAndPaste";
};

export type VaultStatus = "unauthenticated" | "locked" | "unlocked";
export type VaultState = {
  userEmail: string | null;
  status: VaultStatus;
  serverUrl: string | null;
};

export type ErrorType = (typeof ERRORS)[keyof typeof ERRORS];
