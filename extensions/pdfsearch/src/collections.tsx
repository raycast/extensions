import { ActionPanel, Action, List, LocalStorage, showToast, Alert, Icon, Color, confirmAlert } from "@raycast/api";
import { useState } from "react";
import Search from "./views/search";
import { usePromise } from "@raycast/utils";
import { Collection } from "./type";
import { CreateCollectionForm } from "./views/form";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");

  const { data, isLoading, revalidate } = usePromise(async () => {
    const indexes = await LocalStorage.allItems();
    const parsedIndexes: { [key: string]: Collection } = {};
    Object.keys(indexes).forEach((key) => (parsedIndexes[key] = JSON.parse(indexes[key])));
    return parsedIndexes;
  });

  const handleDelete = async (name: string) => {
    await confirmAlert({
      title: `Delete Collection ${name}`,
      icon: { source: Icon.Trash, tintColor: Color.Red },
      message: "Are you sure you want to delete this collection?",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete Collection",
        onAction: async () => {
          // remove record of collection
          await LocalStorage.removeItem(name);
          revalidate();
          showToast({ title: "Success", message: `Successfully deleted collection ${name}!` });
        },
      },
    });
  };

  return (
    <List
      key="collections"
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search collections..."
      throttle
      actions={
        <ActionPanel>
          <Action.Push title="Create New Collection" target={<CreateCollectionForm revalidate={revalidate} />} />
        </ActionPanel>
      }
    >
      {data
        ? Object.keys(data)
            .filter((collection) => collection.toLocaleLowerCase().includes(searchText.toLocaleLowerCase()))
            .map((key) => (
              <List.Item
                key={data[key].name}
                title={data[key].name}
                subtitle={data[key].description}
                actions={
                  <ActionPanel>
                    <Action.Push title="Search" target={<Search collectionName={data[key].name} />} />
                    <Action.Push
                      title="Edit Collection"
                      target={<CreateCollectionForm collection={data[key]} revalidate={revalidate} />}
                    />
                    <Action.Push
                      title="Create New Collection"
                      target={<CreateCollectionForm revalidate={revalidate} />}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                    />
                    <Action
                      title="Delete Collection"
                      onAction={() => handleDelete(data[key].name)}
                      style={Action.Style.Destructive}
                    />
                  </ActionPanel>
                }
              />
            ))
        : null}
    </List>
  );
}
