import { getPreferenceValues } from "@raycast/api"
import { SniptideClient, type Visibility } from "@sniptide/sdk"
import { apiToken, instanceUrl } from "./lib/config"

// The extension preferences declared in package.json.
interface ExtensionPreferences {
  token: string
  instanceUrl?: string
  defaultVisibility?: Visibility
}

// A client for the instance and token in the preferences. Throws a ConfigError the commands show
// with a way into the preferences.
export function client() {
  const preferences = getPreferenceValues<ExtensionPreferences>()
  return new SniptideClient(apiToken(preferences.token), instanceUrl(preferences.instanceUrl))
}

export function defaultVisibility(): Visibility {
  return getPreferenceValues<ExtensionPreferences>().defaultVisibility ?? "unlisted"
}
