import { Action, ActionPanel, Icon, List, useNavigation, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import { useAssistant } from "./hook/useAssistant";
import { AssistantListView } from "./view/assistant/list";
import { AssistantImportForm } from "./view/assistant/importForm";
import { useSnippet } from "./hook/useSnippet";
import { ITalkAssistant } from "./ai/type";
import { AssistantFormLocal } from "./view/assistant/formLocal";
import { AssistantFormApi } from "./view/assistant/formApi";
import { useLlm } from "./hook/useLlm";
import { needOnboarding } from "./type/config";
import Onboarding from "./onboarding";
import { useOnboarding } from "./hook/useOnboarding";

export default function Assistant() {
  const collectionsAssistant = useAssistant();
  const collectionsLlm = useLlm();
  const collectionsSnippet = useSnippet();
  const hookOnboarding = useOnboarding();
  const [searchText, setSearchText] = useState<string>("");
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(null);
  const { push } = useNavigation();

  useEffect(() => {
    if (searchText != "" && searchText.length > 1) {
      collectionsAssistant.data = collectionsAssistant.data.filter((x: ITalkAssistant) => x.title.includes(searchText));
    }
  }, [searchText]);

  if (
    !hookOnboarding.data &&
    (needOnboarding(collectionsAssistant.data.length) || collectionsAssistant.data.length === 0)
  ) {
    return <Onboarding />;
  }

  const getActionList = (
    <ActionPanel>
      <Action
        title={"Create Assistant"}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        icon={Icon.Plus}
        onAction={() =>
          push(
            <AssistantFormLocal
              name={searchText}
              use={{ assistants: collectionsAssistant, snippets: collectionsSnippet.data, llms: collectionsLlm.data }}
            />
          )
        }
      />
      <Action
        title={"Import Assistant"}
        icon={Icon.PlusCircle}
        onAction={() =>
          push(<AssistantImportForm use={{ assistants: collectionsAssistant, llms: collectionsLlm.data }} />)
        }
      />
      <Action
        title={"Reload Assistants From Api"}
        icon={Icon.Download}
        onAction={() => collectionsAssistant.reload()}
      />
    </ActionPanel>
  );
  const getActionItem = (assistant: ITalkAssistant) => (
    <ActionPanel>
      <ActionPanel.Section title="Modify">
        <Action
          title={"Edit Assistant"}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          icon={Icon.Pencil}
          onAction={() =>
            assistant.isLocal
              ? push(
                  <AssistantFormLocal
                    assistant={assistant}
                    use={{
                      assistants: collectionsAssistant,
                      snippets: collectionsSnippet.data,
                      llms: collectionsLlm.data,
                    }}
                  />
                )
              : push(
                  <AssistantFormApi
                    assistant={assistant}
                    use={{
                      assistants: collectionsAssistant,
                      snippets: collectionsSnippet.data,
                      llms: collectionsLlm.data,
                    }}
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
            <AssistantFormLocal
              name={searchText}
              use={{ assistants: collectionsAssistant, snippets: collectionsSnippet.data, llms: collectionsLlm.data }}
            />
          )
        }
      />
      <Action
        title={"Import Assistant"}
        icon={Icon.PlusCircle}
        onAction={() =>
          push(<AssistantImportForm use={{ assistants: collectionsAssistant, llms: collectionsLlm.data }} />)
        }
      />
      <Action
        title={"Reload Assistants From Api"}
        icon={Icon.Download}
        onAction={() => collectionsAssistant.reload()}
      />
    </ActionPanel>
  );
  const searchBarPlaceholder = "Search assistant...";

  return (
    <List
      isShowingDetail={collectionsAssistant.data.length === 0 ? false : true}
      isLoading={collectionsAssistant.isLoading}
      filtering={false}
      throttle={false}
      selectedItemId={selectedAssistantId || undefined}
      onSelectionChange={(id) => setSelectedAssistantId(id)}
      searchBarPlaceholder={searchBarPlaceholder}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      actions={getActionList}
    >
      <AssistantListView
        key="assistants"
        title="Assistants"
        assistants={collectionsAssistant.data}
        snippets={collectionsSnippet.data}
        llms={collectionsLlm.data}
        selectedAssistant={selectedAssistantId}
        actionPanel={getActionItem}
      />
    </List>
  );
}
