import { getPreferenceValues } from "@raycast/api";
import { Client, isValidToken } from "./api";

export function getClient(): Client {
  const { apiToken } = getPreferenceValues<Preferences>();
  if (!isValidToken(apiToken)) {
    throw new Error(
      "Your API token should start with pat_. Create one in Privatus Analytics under Workspace settings, API tokens.",
    );
  }
  return new Client(apiToken);
}
