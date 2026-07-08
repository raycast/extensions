import { List, Icon } from "@raycast/api";
import { getColor } from "../utils/colors";
import { Language } from "../data/types";

export function LanguageDropdown(props: { languages: Language[]; onLanguageChange: (newValue: string) => void }) {
  const { languages, onLanguageChange } = props;
  return (
    <List.Dropdown
      tooltip="Select Language"
      onChange={(newValue) => {
        onLanguageChange(newValue);
      }}
      defaultValue={languages[0]?.id}
    >
      <List.Dropdown.Section title="Language Notebooks">
        {languages.map((language) => (
          <List.Dropdown.Item
            key={language.id}
            title={language.name}
            value={language.id}
            icon={{ source: Icon.Circle, tintColor: getColor(language.color) }}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
