import { Action, ActionPanel, Icon, List } from "@raycast/api"
import { useCachedPromise } from "@raycast/utils"
import { client } from "./api"
import { FailureView } from "./components/failure-view"
import { PasteList } from "./components/paste-list"
import { messages } from "./lib/messages"
import { report } from "./report"

export default function SearchCollections() {
  const { data, isLoading, error } = useCachedPromise(
    async () => (await client().listCollections()).collections,
    [],
    { onError: (failure) => report(failure, messages.failed) },
  )

  return (
    <List isLoading={isLoading} searchBarPlaceholder={messages.searchCollections}>
      {error && !data ? (
        <FailureView error={error} />
      ) : (
        <List.EmptyView
          icon={Icon.Folder}
          title={messages.noCollectionsTitle}
          description={messages.noCollectionsBody}
        />
      )}
      {data?.map((collection) => (
        <List.Item
          key={collection.slug}
          icon={Icon.Folder}
          title={collection.name}
          accessories={[{ text: messages.pasteCount(collection.pasteCount) }]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.List}
                title={messages.showPastes}
                target={<PasteList collection={collection} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}
