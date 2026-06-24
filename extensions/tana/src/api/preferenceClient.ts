import { getPreferenceValues } from "@raycast/api";
import { createTanaMcpClient } from "./TanaAPIClient";

export type TanaPreferences = {
  workspaceApiToken: string;
  workspaceId?: string;
};

export const getTanaPreferences = () => getPreferenceValues<TanaPreferences>();

export const createPreferenceClient = (workspaceId?: string) => {
  const preferences = getTanaPreferences();
  return createTanaMcpClient({
    token: preferences.workspaceApiToken,
    workspaceId: workspaceId ?? preferences.workspaceId ?? "",
  });
};
