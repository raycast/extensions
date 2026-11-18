import { ActionPanel, Action, Icon, List, Color, showToast, Toast, Keyboard } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { deleteEntry } from "./data/data";
import { getColor } from "./utils/colors";
import { LanguageDropdown } from "./components/LanguageDropdown";
import LanguageForm from "./components/LanguageForm";
import { AddWordAction } from "./components/AddWordAction";
import { useEffect, useState } from "react";
import { formattedDate } from "./utils/formatting";
import { useNotebook } from "./hooks/useNotebook";
import { EntryForm } from "./components/EntryForm";
import { useLanguages } from "./hooks/useLanguages";

export default function Command() {
  const { languages, refresh: refreshLanguages } = useLanguages();
  const [selectedLanguage, setSelectedLanguage] = useCachedState<string>("selected-language", languages[0]?.id ?? "");
  const [searchText, setSearchText] = useState("");

  const { entries, refresh: refreshEntries } = useNotebook(selectedLanguage);

  useEffect(() => {
    if (languages.find((l) => l.id === selectedLanguage) === undefined && languages.length > 0) {
      setSelectedLanguage(languages[0].id);
    }
  }, [languages]);

  async function handleDeleteEntry(id: string) {
    try {
      deleteEntry(id);
      refreshEntries();
      await showToast({ style: Toast.Style.Success, title: "Word successfully deleted" });
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: (e as Error).message });
    }
  }

  if (languages.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No languages found"
          description="Add a language first to start building your vocabulary notebook!"
          icon={{ source: Icon.ExclamationMark, tintColor: Color.SecondaryText }}
          actions={
            <ActionPanel>
              <Action.Push title="Add New Language" target={<LanguageForm mode="add" />} onPop={refreshLanguages} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      filtering={true}
      throttle={true}
      isLoading={entries === undefined}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <LanguageDropdown languages={languages} value={selectedLanguage} onLanguageChange={setSelectedLanguage} />
      }
    >
      {searchText.trim() && (
        <List.Section title="Actions">
          <List.Item
            title={`Add "${searchText}"`}
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <AddWordAction
                  submission={searchText}
                  selectedLanguageId={selectedLanguage}
                  onRefresh={refreshEntries}
                  languages={languages}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {entries !== undefined && entries.length === 0 ? (
        <List.EmptyView
          title="No words found"
          description="Add some words to your notebook!"
          icon={{ source: Icon.List, tintColor: Color.SecondaryText }}
          actions={
            <ActionPanel>
              <AddWordAction
                submission={searchText}
                selectedLanguageId={selectedLanguage}
                onRefresh={refreshEntries}
                languages={languages}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={"Total count: " + (entries?.length ?? 0)}>
          {(entries ?? []).map((entry) => {
            const language = languages.find((l) => l.id === entry.languageId);

            return (
              <List.Item
                key={entry.id}
                title={`${entry.word} - ${entry.translation}`}
                subtitle={formattedDate(entry.timestamp)}
                accessories={[
                  {
                    tag: {
                      value: language?.abbreviation ? language.abbreviation : language?.name,
                      color: getColor(language?.color ?? "") as Color.ColorLike,
                    },
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Word" content={entry.word} />
                    <AddWordAction
                      submission={searchText}
                      selectedLanguageId={selectedLanguage}
                      onRefresh={refreshEntries}
                      languages={languages}
                    />
                    <Action.Push
                      title="Edit Word"
                      icon={Icon.Pencil}
                      target={<EntryForm initial={entry} onRefresh={refreshEntries} />}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                    />
                    <Action
                      title="Delete Word"
                      icon={Icon.Trash}
                      onAction={() => handleDeleteEntry(entry.id)}
                      style={Action.Style.Destructive}
                      shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
