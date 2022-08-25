import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  closeMainWindow,
  confirmAlert,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { deleteSnippetFile, loadSnippets } from "./utils/snippets";
import { snippetTypesMap } from "./utils/types";
import { useCachedPromise } from "@raycast/utils";
import CreateSnippet from "./create-snippet";
import { XMLToFMObjects } from "./utils/FmClipTools";

export default function Command() {
  const { data: snippets, isLoading, revalidate } = useCachedPromise(loadSnippets, [], { initialData: [] });

  function CreateSnippetAction() {
    return (
      <Action.Push
        title="Create Snippet"
        icon={Icon.Plus}
        shortcut={{ key: "n", modifiers: ["cmd"] }}
        target={<CreateSnippet onPop={revalidate} />}
      />
    );
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      actions={
        <ActionPanel>
          <CreateSnippetAction />
        </ActionPanel>
      }
    >
      {snippets.map((snippet) => (
        <List.Item
          title={snippet.name}
          key={snippet.id}
          id={snippet.id}
          detail={
            <List.Item.Detail
              markdown={`${snippet.description === "" ? "*No Description*" : snippet.description}

---
${snippet.snippet}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Type" text={snippetTypesMap[snippet.type]} />
                  <List.Item.Detail.Metadata.TagList title="Tags">
                    <List.Item.Detail.Metadata.TagList.Item text="test" />
                    <List.Item.Detail.Metadata.TagList.Item text="test" />
                  </List.Item.Detail.Metadata.TagList>
                </List.Item.Detail.Metadata>
              }
            />
          }
          //   subtitle={snippetTypesMap[snippet.type]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title="Copy Snippet"
                  icon={Icon.Clipboard}
                  shortcut={{ key: "c", modifiers: ["cmd"] }}
                  onAction={async () => {
                    await Clipboard.copy(snippet.snippet);
                    try {
                      XMLToFMObjects();
                      closeMainWindow();
                      showHUD("Copied to Clipboard");
                    } catch (e) {
                      showToast({
                        title: "Error",
                        style: Toast.Style.Failure,
                        message: e instanceof Error ? e.message : "Unknown error",
                      });
                    }
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Raw Text"
                  icon={Icon.Text}
                  shortcut={{ key: "c", modifiers: ["cmd", "shift"] }}
                  content={snippet.snippet}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action title="Edit Snippet" icon={Icon.Pencil} shortcut={{ key: "e", modifiers: ["cmd"] }} />
                <CreateSnippetAction />
                <Action
                  title="Export Snippet"
                  icon={Icon.Upload}
                  shortcut={{ key: "e", modifiers: ["cmd", "shift"] }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Delete Snippet"
                  icon={Icon.Trash}
                  shortcut={{ key: "delete", modifiers: ["cmd"] }}
                  style={Action.Style.Destructive}
                  onAction={async () => {
                    if (
                      await confirmAlert({
                        title: "Are you sure?",
                        message: "This will permantely delete the snippet. This cannot be undone.",
                        primaryAction: { style: Alert.ActionStyle.Destructive, title: "Delete" },
                      })
                    ) {
                      deleteSnippetFile(snippet);
                      revalidate();
                    }
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
