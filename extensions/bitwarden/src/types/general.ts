/* Put types that you feel like they still don't deserve a file of their own here */

import { ERROR_TYPES } from "~/utils/errors";

// This should be updated with the command "name" values in the package.json file
export type CommandName = "search" | "generate-password" | "generate-password-quick";

export type VaultStatus = "unauthenticated" | "locked" | "unlocked";
export type VaultState = {
  userEmail: string | null;
  status: VaultStatus;
  serverUrl: string | null;
};

export type ErrorType = (typeof ERROR_TYPES)[keyof typeof ERROR_TYPES];
