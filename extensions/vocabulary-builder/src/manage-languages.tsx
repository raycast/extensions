import { ActionPanel, Action, Icon, List, showToast, Toast, confirmAlert, Alert, Keyboard } from "@raycast/api";
import { deleteLanguage } from "./data/data";
import LanguageForm from "./components/LanguageForm";
import { getColor } from "./utils/colors";
import { useLanguages } from "./hooks/useLanguages";
import { EmptyLanguagesView } from "./components/EmptyLanguagesView";

export default function Command() {
  const { languages, refresh } = useLanguages();

  async function handleDelete(id: string, name: string) {
    const options: Alert.Options = {
      title: "Delete Language",
      message: `Are you sure you want to delete ${name} language? This action cannot be undone and will also delete all words for this language!`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    };

    if (await confirmAlert(options)) {
      try {
        deleteLanguage(id);
        refresh();
        await showToast({ style: Toast.Style.Success, title: "Language successfully deleted" });
      } catch (e) {
        await showToast({ style: Toast.Style.Failure, title: (e as Error).message });
      }
    }
  }

  if (languages.length === 0) {
    return <EmptyLanguagesView onLanguageAdded={refresh} />;
  }

  return (
    <List searchBarPlaceholder="Search languages...">
      {languages.map((language) => (
        <List.Item
          key={language.id}
          icon={{ source: Icon.Dot, tintColor: getColor(language.color) }}
          title={language.name}
          accessories={[{ tag: language.abbreviation }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Language"
                icon={Icon.Pencil}
                target={<LanguageForm mode="edit" initial={language} />}
                shortcut={Keyboard.Shortcut.Common.Edit}
                onPop={refresh}
              />
              <Action.Push
                title="Add New Language"
                icon={Icon.PlusSquare}
                target={<LanguageForm mode="add" />}
                shortcut={Keyboard.Shortcut.Common.New}
                onPop={refresh}
              />
              <Action
                title="Delete Language"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => handleDelete(language.id, language.name)}
                shortcut={{ macOS: { modifiers: ["cmd"], key: "d" }, Windows: { modifiers: ["ctrl"], key: "d" } }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
