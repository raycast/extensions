import { getPreferenceValues } from "@raycast/api";
import Forecast from "forecast-promise";

interface Preferences {
  token: string;
  accountId: string;
}

const { token, accountId }: Preferences = getPreferenceValues();

if (!token || !accountId) {
  // This error will be caught by Raycast and displayed to the user.
  throw new Error("Missing Forecast API token or account ID in preferences.");
}

export const forecast = new Forecast({
  accountId,
  token,
});
