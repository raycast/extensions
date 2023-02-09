import React from "react";
import { Action, ActionPanel, Color, Form, Icon, List, useNavigation } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { languages, supportedLanguagesByCode } from "./languages";
import { AUTO_DETECT } from "./simple-translate";
import { LanguageCodeSet, usePreferences, useSelectedLanguagesSet } from "./hooks";

const isSameLanguageSet = (langSet1: LanguageCodeSet, langSet2: LanguageCodeSet) => {
  return langSet1.langFrom === langSet2.langFrom && langSet1.langTo === langSet2.langTo;
};

export const AddLanguageForm: React.VFC<{
  onAddLanguage: (data: LanguageCodeSet) => void;
}> = ({ onAddLanguage }) => {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add language set"
            onSubmit={(values: LanguageCodeSet) => {
              onAddLanguage(values);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="langFrom">
        {languages.map((lang) => (
          <Form.Dropdown.Item key={lang.code} value={lang.code} title={lang.name} icon={lang?.flag ?? "🏳️"} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="langTo">
        {languages
          .filter((lang) => lang.code !== AUTO_DETECT)
          .map((lang) => (
            <Form.Dropdown.Item key={lang.code} value={lang.code} title={lang.name} icon={lang?.flag ?? "🏳️"} />
          ))}
      </Form.Dropdown>
    </Form>
  );
};

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

export const LanguagesManager: React.VFC = () => {
  const navigation = useNavigation();
  const preferences = usePreferences();
  const preferencesLanguageSet: LanguageCodeSet = { langFrom: preferences.lang1, langTo: preferences.lang2 };
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
      {!languages.some((l) => isSameLanguageSet(l, selectedLanguageSet)) && (
        <SaveCurrentLanguageSet
          languageSet={selectedLanguageSet}
          onSelect={() => setLanguages([...languages, selectedLanguageSet])}
        />
      )}
      <LanguagesManagerItem
        languageSet={{ langFrom: preferences.lang1, langTo: preferences.lang2 }}
        onSelect={() => {
          setSelectedLanguageSet({ langFrom: preferences.lang1, langTo: preferences.lang2 });
          navigation.pop();
        }}
        selected={isSameLanguageSet(selectedLanguageSet, preferencesLanguageSet)}
      />
      {languages.map((langSet) => (
        <LanguagesManagerItem
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
