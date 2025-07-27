import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect } from "react";
import { useImmer } from "use-immer";
import supportedLanguages from "../../data/supportedLanguages";
import { usePreferences } from "../../hooks";
import { Language } from "../../types";

export function LanguagesManagerItem({
  language,
  isPrimaryLanguage,
  onSelect,
  onDelete,
  selected,
}: {
  language: Language;
  isPrimaryLanguage: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  selected?: boolean;
}) {
  return (
    <List.Item
      title={language.title}
      keywords={[language.title, language.value]}
      accessories={
        selected
          ? [{ icon: { tintColor: Color.Green, source: Icon.Checkmark } }]
          : undefined
      }
      actions={
        !isPrimaryLanguage && (
          <ActionPanel>
            <Action
              title={selected ? "Remove" : "Select"}
              onAction={selected ? onDelete : onSelect}
              icon={{ tintColor: Color.Green, source: Icon.Checkmark }}
            />
          </ActionPanel>
        )
      }
    />
  );
}

export const LanguagesManagerList = () => {
  const preference = usePreferences();
  const [selectedLanguages, setSelectedLanguages] = useImmer<Language[]>([]);

  const getSelectedLanguages = async () => {
    const selectedLanguages = await LocalStorage.getItem("SelectedLanguages");

    const primaryLanguage = {
      title:
        supportedLanguages.find(
          (lang) => lang.value === preference.primaryLanguage,
        )?.title ?? "🇺🇸 English (US)",
      value: preference.primaryLanguage,
      isDefault: true,
    } as Language;

    if (typeof selectedLanguages !== "undefined") {
      const data = JSON.parse(
        selectedLanguages as unknown as string,
      ) as Language[];

      setSelectedLanguages((draft) => {
        draft.push(...data, primaryLanguage);
      });
    } else {
      setSelectedLanguages((draft) => {
        draft.push(primaryLanguage);
      });
    }
  };

  const selectLanguage = (language: Language) => {
    setSelectedLanguages((draft) => {
      draft.push(language);
    });
    const payload = [...selectedLanguages, language];
    LocalStorage.setItem("SelectedLanguages", JSON.stringify(payload));
    showToast(Toast.Style.Success, "Language set was saved!");
  };

  const unselectLanguage = (language: Language) => {
    setSelectedLanguages((draft) => {
      const deleteIndex = draft.findIndex(
        (lang) => lang.value === language.value,
      );
      if (deleteIndex !== -1) {
        draft.splice(deleteIndex, 1);
      }
    });
    const updatedLanguages = selectedLanguages.filter(
      (lang) => lang.value !== language.value,
    );
    LocalStorage.setItem("SelectedLanguages", JSON.stringify(updatedLanguages));
  };

  useEffect(() => {
    getSelectedLanguages();
  }, []);

  return (
    <List>
      <List.Section title="Supported Languages">
        {supportedLanguages?.map((language) => (
          <LanguagesManagerItem
            key={language.value}
            language={language}
            isPrimaryLanguage={
              selectedLanguages.find((lang) => lang.value === language.value)
                ?.isDefault ?? false
            }
            selected={
              selectedLanguages.find((lang) => lang.value === language.value)
                ? true
                : false
            }
            onSelect={() => {
              selectLanguage(language);
              showToast(Toast.Style.Success, `Added ${language.title}`);
            }}
            onDelete={() => {
              unselectLanguage(language);
              showToast(Toast.Style.Failure, `Removed ${language.title}`);
            }}
          />
        ))}
      </List.Section>
    </List>
  );
};
