import React from "react";
import { Action, ActionPanel, Color, Form, Icon, List, useNavigation } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { supportedLanguagesByCode } from "../languages";
import { LanguageCodeSet } from "../types";
import { isSameLanguageSet, usePreferencesLanguageSet, useSelectedLanguagesSet } from "../hooks";
import { AddLanguageForm } from "./AddLanguageForm";

export function LanguagesManagerItem({
  languageSet,
  onSelect,
  onDelete,
  selected,
}: {
  languageSet: LanguageCodeSet;
  onSelect: () => void;
  onDelete?: () => void;
  selected?: boolean;
}) {
  const langFrom = supportedLanguagesByCode[languageSet.langFrom];
  const langTo = supportedLanguagesByCode[languageSet.langTo];

  return (
    <List.Item
      subtitle={`${langFrom.flag ?? "🏳"} -> ${langTo.flag ?? "🏳"}`}
      title={`${langFrom.name} -> ${langTo.name}`}
      keywords={[langFrom.name, langFrom.code, langTo.name, langTo.code]}
      accessories={selected ? [{ icon: { tintColor: Color.Green, source: Icon.Checkmark } }] : undefined}
      actions={
        <ActionPanel>
          <Action title="Select" onAction={onSelect} icon={{ tintColor: Color.Green, source: Icon.Checkmark }} />
          {onDelete && <Action style={Action.Style.Destructive} title="Delete" onAction={onDelete} icon={Icon.Trash} />}
        </ActionPanel>
      }
    />
  );
}

export const SaveCurrentLanguageSet: React.FC<{ languageSet: LanguageCodeSet; onSelect: () => void }> = ({
  languageSet,
  onSelect,
}) => {
  const langFrom = supportedLanguagesByCode[languageSet.langFrom];
  const langTo = supportedLanguagesByCode[languageSet.langTo];
  return (
    <List.Item
      icon={Icon.SaveDocument}
      title="Save current set"
      subtitle={`${langFrom.name} ${langFrom?.flag ?? "🏳"} -> ${langTo?.flag ?? "🏳"} ${langTo.name}`}
      actions={
        <ActionPanel>
          <Action title="Save current set" onAction={onSelect} />
        </ActionPanel>
      }
    />
  );
};

export const LanguagesManagerList: React.VFC = () => {
  const navigation = useNavigation();
  const preferencesLanguageSet = usePreferencesLanguageSet();
  const [selectedLanguageSet, setSelectedLanguageSet] = useSelectedLanguagesSet();
  const [languages, setLanguages] = useCachedState<LanguageCodeSet[]>("languages", []);

  return (
    <List
      actions={
        <ActionPanel>
          <Action title="Remove all" onAction={() => setLanguages([])} />
        </ActionPanel>
      }
    >
      <List.Item
        icon={{ source: Icon.Plus }}
        title="Add new language set..."
        actions={
          <ActionPanel>
            <Action.Push
              title="Add new language set..."
              target={
                <AddLanguageForm
                  onAddLanguage={(langSet) => {
                    setLanguages([...languages, langSet]);
                    navigation.pop();
                  }}
                />
              }
            />
          </ActionPanel>
        }
      />
      {!languages.some((l) => isSameLanguageSet(l, selectedLanguageSet)) &&
        !isSameLanguageSet(preferencesLanguageSet, selectedLanguageSet) && (
          <SaveCurrentLanguageSet
            languageSet={selectedLanguageSet}
            onSelect={() => setLanguages([...languages, selectedLanguageSet])}
          />
        )}
      <LanguagesManagerItem
        languageSet={preferencesLanguageSet}
        onSelect={() => {
          setSelectedLanguageSet(preferencesLanguageSet);
          navigation.pop();
        }}
        selected={isSameLanguageSet(selectedLanguageSet, preferencesLanguageSet)}
      />
      {languages.map((langSet) => (
        <LanguagesManagerItem
          key={`${langSet.langFrom} ${langSet.langTo}`}
          selected={isSameLanguageSet(selectedLanguageSet, langSet)}
          languageSet={langSet}
          onSelect={() => {
            setSelectedLanguageSet(langSet);
            navigation.pop();
          }}
          onDelete={() => {
            setLanguages(languages.filter((l) => !isSameLanguageSet(l, langSet)));
          }}
        />
      ))}
    </List>
  );
};
