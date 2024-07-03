import { Action, ActionPanel, Icon, List, useNavigation, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import { useAssistant } from "./hook/useAssistant";
import { AssistantForm } from "./view/assistant/form";
import { AssistantListView } from "./view/assistant/list";
import { AssistantImportForm } from "./view/assistant/importForm";
import { TalkAssistantType } from "./type/talk";
import { AssistantHookType } from "./type/assistant";
import { useSnippet } from "./hook/useSnippet";

export default function Assistant() {
  const collectionsAssistant = useAssistant();
  const collectionsSnippet = useSnippet();
  const [searchText, setSearchText] = useState<string>("");
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(null);
  const { push } = useNavigation();
  const collectionsAssistants: AssistantHookType = collectionsAssistant;

  useEffect(() => {
    if (searchText != "" && searchText.length > 1) {
      collectionsAssistants.data = collectionsAssistant.data.filter((x: TalkAssistantType) =>
        x.title.includes(searchText)
      );
    } else {
      collectionsAssistants.data = collectionsAssistant.data;
    }
  }, [searchText]);

  const getActionList = (
    <ActionPanel>
      <Action
        title={"Create Assistant"}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        icon={Icon.Plus}
        onAction={() =>
          push(
            <AssistantForm
              name={searchText}
              use={{ assistants: collectionsAssistants, snippets: collectionsSnippet.data }}
            />
          )
        }
      />
      <Action
        title={"Import Assistant"}
        icon={Icon.PlusCircle}
        onAction={() => push(<AssistantImportForm use={{ assistants: collectionsAssistants }} />)}
      />
      <Action title={"Reload Assistants"} icon={Icon.Download} onAction={() => collectionsAssistant.reload()} />
    </ActionPanel>
  );
  const getActionItem = (assistant: TalkAssistantType) => (
    <ActionPanel>
      <ActionPanel.Section title="Modify">
        <Action
          title={"Edit Assistant"}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          icon={Icon.Pencil}
          onAction={() =>
            push(
              <AssistantForm
                assistant={assistant}
                use={{ assistants: collectionsAssistants, snippets: collectionsSnippet.data }}
              />
            )
          }
        />
        <Action
          style={Action.Style.Destructive}
          icon={Icon.RotateAntiClockwise}
          title="Remove"
          onAction={async () => {
            await confirmAlert({
              title: "Are you sure you want to remove this assistant from your collection?",
              message: "This action cannot be undone",
              icon: Icon.RotateAntiClockwise,
              primaryAction: {
                title: "Remove",
                style: Alert.ActionStyle.Destructive,
                onAction: () => {
                  collectionsAssistant.remove(assistant);
                },
              },
            });
          }}
        />
      </ActionPanel.Section>
      <Action
        title={"Create Assistant"}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        icon={Icon.Plus}
        onAction={() =>
          push(
            <AssistantForm
              name={searchText}
              use={{ assistants: collectionsAssistants, snippets: collectionsSnippet.data }}
            />
          )
        }
      />
      <Action
        title={"Import Assistant"}
        icon={Icon.PlusCircle}
        onAction={() => push(<AssistantImportForm use={{ assistants: collectionsAssistants }} />)}
      />
      <Action
        title={"Reload Assistants From Api"}
        icon={Icon.Download}
        onAction={() => collectionsAssistant.reload()}
      />
    </ActionPanel>
  );

  return (
    <List
      isShowingDetail={collectionsAssistants.data.length === 0 ? false : true}
      isLoading={collectionsAssistant.isLoading}
      filtering={false}
      throttle={false}
      selectedItemId={selectedAssistantId || undefined}
      onSelectionChange={(id) => setSelectedAssistantId(id)}
      searchBarPlaceholder="Search assistant..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      actions={getActionList}
    >
      {collectionsAssistants.data.length === 0 ? (
        <List.EmptyView
          title="No assistants"
          description="Create new assistant with ⌘ + c shortcut"
          icon={Icon.Stars}
        />
      ) : (
        <AssistantListView
          key="assistants"
          title="Assistants"
          assistants={collectionsAssistants.data}
          snippets={collectionsSnippet.data}
          selectedAssistant={selectedAssistantId}
          actionPanel={getActionItem}
        />
      )}
    </List>
  );
}
