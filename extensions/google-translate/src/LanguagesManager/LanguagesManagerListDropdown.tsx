import React from "react";
import { Icon, List, useNavigation } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { supportedLanguagesByCode } from "../languages";
import { LanguageCodeSet } from "../types";
import { usePreferencesLanguageSet, useSelectedLanguagesSet } from "../hooks";
import { LanguagesManagerList } from "./LanguagesManagerList";

export function LanguageManagerListDropdownItem(props: { languageSet: LanguageCodeSet }) {
  const langFrom = supportedLanguagesByCode[props.languageSet.langFrom];
  const langTo = supportedLanguagesByCode[props.languageSet.langTo];

  return (
    <List.Dropdown.Item
      title={`${langFrom.name} ${langFrom?.flag ?? "🏳"} -> ${langTo?.flag ?? "🏳"} ${langTo.name}`}
      value={JSON.stringify(props.languageSet)}
    />
  );
}

export function LanguageManagerListDropdown() {
  const navigation = useNavigation();
  const preferencesLanguageSet = usePreferencesLanguageSet();
  const [selectedLanguageSet, setSelectedLanguageSet] = useSelectedLanguagesSet();
  const [languages] = useCachedState<LanguageCodeSet[]>("languages", []);
  return (
    <List.Dropdown
      value={JSON.stringify(selectedLanguageSet)}
      tooltip="Language Set"
      onChange={(value) => {
        if (value === "manage") {
          navigation.push(<LanguagesManagerList />);
        } else {
          const langSet: LanguageCodeSet = JSON.parse(value);
          setSelectedLanguageSet(langSet);
        }
      }}
    >
      <List.Dropdown.Item icon={Icon.Pencil} title="Manage language sets..." value="manage" />
      <LanguageManagerListDropdownItem languageSet={preferencesLanguageSet} />
      {languages.map((langSet) => (
        <LanguageManagerListDropdownItem key={`${langSet.langFrom} ${langSet.langTo}`} languageSet={langSet} />
      ))}
    </List.Dropdown>
  );
}
