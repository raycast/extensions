import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  environment,
  Icon,
  List,
  LocalStorage,
  showToast,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import { deleteCollection } from "swift:../swift";
import { Collection } from "./type";
import { CreateCollectionForm } from "./views/form";
import Search from "./views/search";

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
      title: `Delete Collection`,
      icon: { source: Icon.Trash },
      message: `Are you sure you want to delete the collection "${name}"?`,
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete Collection",
        onAction: async () => {
          try {
            await deleteCollection(name, environment.supportPath);
            await LocalStorage.removeItem(name);
            showToast({ title: "Success", message: `Successfully deleted the collection "${name}".` });
          } catch (err) {
            showFailureToast(`Failed to delete the collection ${name}. ${err}`);
          }
          revalidate();
        },
      },
    });
  };

  const handleDeleteAll = async () => {
    await confirmAlert({
      title: `Delete All Collections`,
      icon: { source: Icon.Trash },
      message: `Are you sure you want to delete all collections? This action cannot be undone.`,
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete All",
        onAction: async () => {
          try {
            const indexes = await LocalStorage.allItems();
            for (const key of Object.keys(indexes)) {
              await deleteCollection(key, environment.supportPath);
              await LocalStorage.removeItem(key);
            }
            showToast({ title: "Success", message: `Successfully deleted all collections.` });
          } catch (err) {
            showFailureToast(`Failed to delete all collections. ${err}`);
          }
          revalidate();
        },
      },
    });
  };

  return (
    <List
      key="collections"
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search collections"
      throttle
      actions={
        <ActionPanel>
          <Action.Push
            title="Create Collection"
            icon={Icon.Plus}
            target={<CreateCollectionForm revalidate={revalidate} />}
          />
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
                    <Action.Push
                      title="Search Collection"
                      icon={Icon.MagnifyingGlass}
                      target={<Search collectionName={data[key].name} />}
                    />
                    <Action.Push
                      title="Edit Collection"
                      icon={Icon.Pencil}
                      target={<CreateCollectionForm collection={data[key]} revalidate={revalidate} />}
                    />
                    <Action.Push
                      title="Create Collection"
                      icon={Icon.Plus}
                      target={<CreateCollectionForm revalidate={revalidate} />}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
                    />
                    <Action
                      title="Delete Collection"
                      icon={Icon.Trash}
                      shortcut={{ modifiers: ["ctrl"], key: "x" }}
                      style={Action.Style.Destructive}
                      onAction={() => handleDelete(data[key].name)}
                    />
                    <Action
                      title="Delete All Collections"
                      icon={Icon.Trash}
                      shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                      style={Action.Style.Destructive}
                      onAction={handleDeleteAll}
                    />
                  </ActionPanel>
                }
              />
            ))
        : null}
    </List>
  );
}
