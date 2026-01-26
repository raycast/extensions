import { Action, ActionPanel, Color, Icon, List, showToast, Toast, useNavigation } from "@raycast/api"
import React from "react"
import { useFetch } from "./fetch/useFetch"
import { CollectionList } from "./components/CollectionList"
import { HistoryList } from "./components/HistoryList"
import { EnvironmentManager } from "./components/EnvironmentManager"
import { CollectionsResponseType } from "./types"

export default function Command() {
  const { push } = useNavigation()

  const { data, isLoading, error } = useFetch("listCollections")

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed loading collections.",
      message: error.message,
    })
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search in your collections"
      actions={
        <ActionPanel>
          <Action
            title="View Request History"
            icon={Icon.Clock}
            shortcut={{ modifiers: ["cmd"], key: "h" }}
            onAction={() => push(<HistoryList />)}
          />
          <Action
            title="Manage Environments"
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
            onAction={() => push(<EnvironmentManager />)}
          />
        </ActionPanel>
      }
    >
      {data ? (
        (data as CollectionsResponseType).collections.map((collection) => (
          <List.Item
            key={collection.id}
            title={collection.name}
            icon={{ source: Icon.Folder, tintColor: Color.Orange }}
            actions={
              <ActionPanel>
                <Action
                  title="Open Collection"
                  icon={Icon.List}
                  onAction={() => push(<CollectionList id={collection.id} collectionName={collection.name} />)}
                />
              </ActionPanel>
            }
            subtitle={new Date(collection.updatedAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          />
        ))
      ) : (
        <List.EmptyView icon={Icon.Folder} title="No Collections" description="No Postman collections found" />
      )}
    </List>
  )
}
