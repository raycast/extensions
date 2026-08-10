import { Action, Icon } from "@raycast/api";
import { openProviderPreferences } from "../utils/open-provider-preferences";

export function OpenApiKeyPreferencesAction() {
  return <Action title="Open API Key Preferences" icon={Icon.Key} onAction={openProviderPreferences} />;
}
