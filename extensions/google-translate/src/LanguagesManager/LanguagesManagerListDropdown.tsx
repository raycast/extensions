import React from "react";
import { Icon, List, useNavigation } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { LanguageCodeSet } from "../types";
import { usePreferencesLanguageSet, useSelectedLanguagesSet } from "../hooks";
import { LanguagesManagerList } from "./LanguagesManagerList";
import { formatLanguageSet } from "../utils";

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
      <List.Dropdown.Item
        title={formatLanguageSet(preferencesLanguageSet)}
        value={JSON.stringify(preferencesLanguageSet)}
      />
      {languages.map((langSet) => (
        <List.Dropdown.Item
          key={`${langSet.langFrom} ${langSet.langTo}`}
          title={formatLanguageSet(langSet)}
          value={JSON.stringify(langSet)}
        />
      ))}
    </List.Dropdown>
  );
}
