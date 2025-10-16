import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api"
import { useFetch } from "./fetch/useFetch"
import { CollectionList } from "./components/CollectionList"
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
                  onAction={() => push(<CollectionList id={collection.id} />)}
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
        <List.EmptyView />
      )}
    </List>
  )
}
