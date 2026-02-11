import { getAccessToken } from "./oauth";
import { OktaAppLink } from "./types";
import { getPreferenceValues } from "@raycast/api";
import { checkConfiguration } from "./config-check";

export async function getAppLinks(): Promise<OktaAppLink[]> {
  checkConfiguration();
  const { oktaDomain: rawDomain } = getPreferenceValues<{ oktaDomain: string }>();
  const oktaDomain = rawDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const accessToken = await getAccessToken();

  const response = await fetch(`https://${oktaDomain}/api/v1/users/me/appLinks`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("App fetch failed:", response.status, response.statusText, errorText);
    throw new Error(`Failed to fetch apps: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const apps = (await response.json()) as OktaAppLink[];
  return apps;
}
