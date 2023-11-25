import { Action, ActionPanel, Detail, getPreferenceValues, openCommandPreferences } from "@raycast/api";
import { useState } from "react";
import Preferences, { arePreferencesValid } from "./model/preferences";
import SearchByEmail from "./pages/search_user";

export default function Command() {
  const [isValid, setIsValid] = useState(arePreferencesValid(getPreferenceValues<Preferences>()));

  async function updateExtensionSettings() {
    await openCommandPreferences();
    const prefs = getPreferenceValues<Preferences>();
    if (arePreferencesValid(prefs)) {
      setIsValid(true);
    }
  }

  return isValid ? (
    <SearchByEmail />
  ) : (
    <Detail
      markdown="# Extension settings are not valid"
      actions={
        <ActionPanel>
          <Action title="Open settings" onAction={updateExtensionSettings} />
        </ActionPanel>
      }
    />
  );
}
