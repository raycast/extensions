import { List } from "@raycast/api";
import { languages } from "../constants/languages";
import type { ComponentProps } from "react";

type LanguageDropdownProps = ComponentProps<typeof List.Dropdown> & {
  detect?: boolean;
};

export function LanguageDropdown({ detect = false, ...props }: LanguageDropdownProps) {
  return (
    <List.Dropdown {...props}>
      {detect && <List.Dropdown.Item key="auto" value="auto" title="Detect language" />}
      {languages.map((language) => (
        <List.Dropdown.Item
          key={language.value}
          value={language.value}
          title={language.label}
          keywords={"keywords" in language ? language.keywords : []}
        />
      ))}
    </List.Dropdown>
  );
}
