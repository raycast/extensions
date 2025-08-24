import { List } from "@raycast/api";

import type { Language } from "@/type";

interface Props {
  languages: Language[];
  onLanguageChange: (language: string) => void;
}

export function LanguageDropdown(props: Props) {
  return (
    <List.Dropdown tooltip="Select language" storeValue={true} onChange={props.onLanguageChange}>
      <List.Dropdown.Section title="Select language">
        {props.languages.map((language) => (
          <List.Dropdown.Item
            title={language.label}
            key={language.value}
            value={language.value}
            keywords={[language.label, language.value]}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
