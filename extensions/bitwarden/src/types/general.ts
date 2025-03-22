/* Put types that you feel like they still don't deserve a file of their own here */

// This should be updated with the command "name" values in the package.json file
export type CommandName = "search" | "generate-password" | "generate-password-quick";

export type VaultStatus = "unauthenticated" | "locked" | "unlocked";
export type VaultState = {
  userEmail: string | null;
  status: VaultStatus;
  serverUrl: string | null;
};
