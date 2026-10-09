import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getCollections } from "./api";
import { isHttpUrl } from "./client";
import { ConnectionActions } from "./connection-actions";
export default function OpenCollection() {
  const { data, error, isLoading, revalidate } = usePromise(getCollections);
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Find a collection…">
      <List.EmptyView
        title={error ? "Could Not Load Collections" : "No Collections Yet"}
        description={
          error?.message ?? "Create a collection in Linqlo to see it here."
        }
        actions={
          <ActionPanel>
            <ConnectionActions retry={revalidate} />
          </ActionPanel>
        }
      />
      {data?.map((collection) => (
        <List.Item
          key={collection.id}
          title={collection.title}
          icon={Icon.Folder}
          subtitle={
            data.find((parent) => parent.id === collection.parentId)?.title
          }
          accessories={[{ text: String(collection.count) }]}
          actions={
            <ActionPanel>
              {isHttpUrl(collection.url) && (
                <Action.OpenInBrowser
                  title="Open Collection"
                  url={collection.url}
                />
              )}
              <Action.CopyToClipboard
                title="Copy Collection URL"
                content={collection.url}
              />
              <ConnectionActions retry={revalidate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
