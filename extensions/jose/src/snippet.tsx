import { Action, ActionPanel, Icon, List, useNavigation, confirmAlert, Alert } from "@raycast/api";
import { useEffect, useState } from "react";
import { useSnippet } from "./hook/useSnippet";
import { SnippetListView } from "./view/snippet/list";
import { SnippetImportForm } from "./view/snippet/importForm";
import { SnippetHookType } from "./type/snippet";
import { ITalkSnippet } from "./ai/type";
import { SnippetFormLocal } from "./view/snippet/formLocal";
import { SnippetFormApi } from "./view/snippet/formApi";
import { useLlm } from "./hook/useLlm";
import { needOnboarding } from "./type/config";
import Onboarding from "./onboarding";
import { useAssistant } from "./hook/useAssistant";
import { useOnboarding } from "./hook/useOnboarding";

export default function Snippet() {
  const { push } = useNavigation();
  const collections = useSnippet();
  const collectionsAssistant = useAssistant();
  const collectionsLlm = useLlm();
  const hookOnboarding = useOnboarding();
  const [searchText, setSearchText] = useState<string>("");
  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(null);
  const collectionsSnipppets: SnippetHookType = collections;

  useEffect(() => {
    if (searchText != "" && searchText.length > 1) {
      collectionsSnipppets.data = collections.data.filter((x: ITalkSnippet) => x.title.includes(searchText));
    } else {
      collectionsSnipppets.data = collections.data;
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
        title={"Create Snippet"}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        icon={Icon.Plus}
        onAction={() =>
          push(
            <SnippetFormLocal name={searchText} use={{ snippets: collectionsSnipppets, llms: collectionsLlm.data }} />
          )
        }
      />
      <Action
        title={"Import Snippet"}
        icon={Icon.PlusCircle}
        onAction={() => push(<SnippetImportForm use={{ snippets: collectionsSnipppets, llms: collectionsLlm.data }} />)}
      />
      <Action title={"Reload Snippets From Api"} icon={Icon.Download} onAction={() => collections.reload()} />
    </ActionPanel>
  );
  const getActionItem = (snippet: ITalkSnippet) => (
    <ActionPanel>
      <ActionPanel.Section title="Modify">
        <Action
          title={"Edit Snippet"}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          icon={Icon.Pencil}
          onAction={() =>
            snippet.isLocal
              ? push(
                  <SnippetFormLocal
                    snippet={snippet}
                    use={{ snippets: collectionsSnipppets, llms: collectionsLlm.data }}
                  />
                )
              : push(
                  <SnippetFormApi
                    snippet={snippet}
                    use={{ snippets: collectionsSnipppets, llms: collectionsLlm.data }}
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
              title: "Are you sure you want to remove this Snippet from your collection?",
              message: "This action cannot be undone",
              icon: Icon.RotateAntiClockwise,
              primaryAction: {
                title: "Remove",
                style: Alert.ActionStyle.Destructive,
                onAction: () => {
                  collections.remove(snippet);
                },
              },
            });
          }}
        />
      </ActionPanel.Section>
      <Action
        title={"Create Snippet"}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        icon={Icon.Plus}
        onAction={() =>
          push(<SnippetFormLocal name={searchText} use={{ snippets: collections, llms: collectionsLlm.data }} />)
        }
      />
      <Action
        title={"Import Snippet"}
        icon={Icon.PlusCircle}
        onAction={() => push(<SnippetImportForm use={{ snippets: collections, llms: collectionsLlm.data }} />)}
      />
      <Action title={"Reload Snippets From Api"} icon={Icon.Download} onAction={() => collections.reload()} />
    </ActionPanel>
  );
  const searchBarPlaceholder = "Search Snippet...";

  return (
    <List
      isShowingDetail={collectionsSnipppets.data.length === 0 ? false : true}
      isLoading={collections.isLoading}
      filtering={false}
      throttle={false}
      selectedItemId={selectedSnippetId || undefined}
      onSelectionChange={(id) => setSelectedSnippetId(id)}
      searchBarPlaceholder={searchBarPlaceholder}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      actions={getActionList}
    >
      {collectionsSnipppets.data.length === 0 ? (
        <List.EmptyView title="No Snippets" description="Create new Snippet with ⌘ + c shortcut" icon={Icon.Stars} />
      ) : (
        <SnippetListView
          key="Snippets"
          snippets={collectionsSnipppets.data}
          llms={collectionsLlm.data}
          selectedSnippet={selectedSnippetId}
          actionPanel={getActionItem}
        />
      )}
    </List>
  );
}
