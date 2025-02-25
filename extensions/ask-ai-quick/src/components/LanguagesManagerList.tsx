import React from "react";
import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { AddLanguageForm } from "./AddLanguageForm";
import { useLanguage, LanguageSet, useCurrentLanguage } from "../lib/hooks";
import { getLanguageFlag } from "../lib/language";

export const LanguagesManagerItem: React.FC<{
  langset: LanguageSet;
  selected?: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}> = ({ langset, onSelect, onDelete, selected }) => {
  return (
    <List.Item
      subtitle={`${getLanguageFlag(langset.source)} -> ${getLanguageFlag(langset.target)}`}
      title={`${langset.source} -> ${langset.target}`}
      keywords={[langset.source, langset.target]}
      icon={selected ? { tintColor: Color.Green, source: Icon.Checkmark } : undefined}
      actions={
        <ActionPanel>
          <Action title="Select" onAction={onSelect} icon={{ tintColor: Color.Green, source: Icon.Checkmark }} />
          {onDelete && <Action style={Action.Style.Destructive} title="Delete" onAction={onDelete} icon={Icon.Trash} />}
        </ActionPanel>
      }
    />
  );
};

export const LanguagesManagerList = () => {
  const navigation = useNavigation();
  const { langsetList, removeAll, delLang, isLoading } = useLanguage();
  const { langset, setCurrentLangset } = useCurrentLanguage();

  return (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action title="Remove All" onAction={removeAll} />
        </ActionPanel>
      }
    >
      <List.Item
        icon={{ source: Icon.Plus }}
        title="Add new language set..."
        actions={
          <ActionPanel>
            <Action.Push title="Add Languageset" target={<AddLanguageForm />} />
          </ActionPanel>
        }
      />
      {langsetList?.map((item) => (
        <LanguagesManagerItem
          key={item.id}
          langset={item}
          selected={langset?.id === item.id}
          onSelect={() => {
            setCurrentLangset(item.id);
            navigation.pop();
          }}
          onDelete={() => delLang(item.id)}
        />
      ))}
    </List>
  );
};
