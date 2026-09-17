import { List } from "@raycast/api";
import { memo, useMemo } from "react";
import translationDictionaries from "./data/translationDictionaries.json";
import { Preferences } from "./hooks/preferences";

interface Props {
  preferences: Preferences;
  setPreferences: (newPreferences: Preferences) => Promise<void>;
}

function PreferencesTranslationDropdown({ preferences, setPreferences }: Props) {
  const sections = useMemo(
    () =>
      translationDictionaries.map(({ language, dictionaries }) => (
        <List.Dropdown.Section key={language} title={language}>
          {dictionaries.map(({ key, from, to }) => (
            <List.Dropdown.Item key={key} value={key} title={`${from} - ${to} (${key})`} />
          ))}
        </List.Dropdown.Section>
      )),
    [],
  );

  const onChange = (value: string) => {
    setPreferences({ ...preferences, translationKey: value });
  };

  return (
    <List.Dropdown tooltip="Select your translation" value={preferences.translationKey} onChange={onChange}>
      {sections}
    </List.Dropdown>
  );
}

export default memo(PreferencesTranslationDropdown);
