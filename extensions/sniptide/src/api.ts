import { getPreferenceValues } from "@raycast/api"
import { SniptideClient, type Visibility } from "@sniptide/sdk"
import { createHash } from "node:crypto"
import { apiToken, instanceUrl } from "./lib/config"

// A client for the instance and token in the preferences. Throws a ConfigError the commands show
// with a way into the preferences.
export function client() {
  const preferences = getPreferenceValues<Preferences>()
  return new SniptideClient(apiToken(preferences.token), instanceUrl(preferences.instanceUrl))
}

// Identifies the account the preferences point at, so cached lists from one token or instance never
// show after the reader switches to another. The token appears only as a short hash.
export function accountKey() {
  const { token, instanceUrl: instance } = getPreferenceValues<Preferences>()
  const tokenHash = createHash("sha256")
    .update(token?.trim() ?? "")
    .digest("hex")
    .slice(0, 12)
  return `${instance?.trim() ?? ""}|${tokenHash}`
}

export function defaultVisibility(): Visibility {
  return getPreferenceValues<Preferences>().defaultVisibility ?? "unlisted"
}
