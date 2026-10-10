import { Action, ActionPanel, Clipboard, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { callTool, parseCollections } from "./anycap";
import { CaptureList } from "./captures";

export default function BrowseCollections() {
  const { data, isLoading, error } = useCachedPromise(
    async () => parseCollections(await callTool("collections", {})),
    [],
  );
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter collections">
      {error ? (
        <List.EmptyView icon={Icon.Warning} title="Anycap did not answer" description={error.message} />
      ) : (
        <List.EmptyView icon={Icon.Layers} title="No collections yet" description="Gather one in Anycap." />
      )}
      {(error ? [] : (data ?? [])).map((collection) => (
        <List.Item
          key={collection.name}
          icon={collection.emoji ?? Icon.Layers}
          title={collection.name}
          accessories={[{ text: String(collection.count) }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Captures"
                icon={Icon.List}
                target={
                  <CaptureList
                    navigationTitle={collection.name}
                    placeholder={`Filter ${collection.name}`}
                    filtering
                    load={() => callTool("list", { collection: collection.name, limit: 200 })}
                    emptyTitle={() => "Nothing in this collection"}
                  />
                }
              />
              <Action
                title="Copy Brief"
                icon={Icon.Clipboard}
                shortcut={Keyboard.Shortcut.Common.Copy}
                onAction={async () => {
                  try {
                    await Clipboard.copy(await callTool("brief", { collection: collection.name }));
                    await showToast({ style: Toast.Style.Success, title: "Copied brief" });
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Could not copy brief",
                      message: error instanceof Error ? error.message : String(error),
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
