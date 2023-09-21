import { List } from "@raycast/api";
import usePreferences from "./hooks/preferences";
import translationDictionaries from "./data/translationDictionaries.json";

export default function PreferencesTranslationDropdown() {
  const { preferences, setPreferences } = usePreferences();

  const onChange = (value: string) => {
    setPreferences({ ...preferences, translationKey: value });
  };

  return (
    <List.Dropdown tooltip="Select your translation" value={preferences.translationKey} onChange={onChange}>
      {translationDictionaries.map(({ language, dictionaries }) => (
        <List.Dropdown.Section key={language} title={language}>
          {dictionaries.map(({ key, from, to }) => (
            <List.Dropdown.Item key={key} value={key} title={`${from} - ${to} (${key})`} />
          ))}
        </List.Dropdown.Section>
      ))}
    </List.Dropdown>
  );
}
