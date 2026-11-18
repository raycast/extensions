import { getPreferenceValues } from "@raycast/api";
import { unwrapToken } from "./auth";

export type Account = { tokenKey: string; token: string; sshUser: string };

const CONFIGURED = [
  { tokenKey: "laravel_forge_api_token", sshUserKey: "laravel_forge_ssh_user" },
  { tokenKey: "laravel_forge_api_token_two", sshUserKey: "laravel_forge_ssh_user_two" },
];

export const accounts = (): Account[] => {
  const preferences = getPreferenceValues<Record<string, string>>();
  return CONFIGURED.map(({ tokenKey, sshUserKey }) => ({
    tokenKey,
    token: unwrapToken(tokenKey),
    sshUser: String(preferences?.[sshUserKey] || "forge"),
  })).filter((account) => account.token);
};

export const accountFor = (tokenKey: string) => accounts().find((account) => account.tokenKey === tokenKey);
