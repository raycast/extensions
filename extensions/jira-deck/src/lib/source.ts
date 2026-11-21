import { getPreferenceValues } from "@raycast/api";
import { siteOrigin } from "./jira";

// Every view gets its data here.
export * from "./jira-data";

/** Changes when the account changes, so cached data from another one isn't shown. */
export function sourceKey(): string {
  const { email } = getPreferenceValues<Preferences>();
  return `${siteOrigin() ?? ""}|${email?.trim() ?? ""}`;
}
