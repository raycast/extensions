import { Action, ActionPanel, Detail, Icon, openCommandPreferences } from "@raycast/api";
import { arePreferencesValid } from "./model/preferences";
import SearchByEmail from "./pages/search_user";
import { usePromise } from "@raycast/utils";

export default function Command() {
  const { isLoading, data: isValid, revalidate } = usePromise(arePreferencesValid);
  
  async function updateExtensionSettings() {
    await openCommandPreferences();
    revalidate();
  }

  return isLoading ? <Detail isLoading markdown="Checking" /> : isValid ? (
    <SearchByEmail />
  ) : (
    <Detail
      markdown="# Extension settings are not valid"
      actions={
        <ActionPanel>
          <Action icon={Icon.Gear} title="Open Settings" onAction={updateExtensionSettings} />
        </ActionPanel>
      }
    />
  );
}
