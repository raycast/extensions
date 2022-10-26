import { MenuBarExtra, getPreferenceValues, openCommandPreferences } from "@raycast/api";

interface Preferences {
  input: string;
}

const preferences = getPreferenceValues<Preferences>();

export default function Command() {
  return (
    <MenuBarExtra title={preferences.input}>
      <MenuItem />
    </MenuBarExtra>
  );

  function MenuItem() {
    openCommandPreferences();

    return null;
  }
}
