import {
  ActionPanel,
  Action,
  List,
  Icon,
  Color,
  useNavigation,
  confirmAlert,
  Alert,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { deleteCollection, getAllCollections } from "./collections";
import type { Collection } from "./types";
import CollectionForm from "./CollectionForm";

export default function ManageCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const refresh = useCallback(() => {
    const all = getAllCollections();
    setCollections(all);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleDelete = async (collection: Collection) => {
    const confirmed = await confirmAlert({
      title: "Delete Collection",
      message: `Are you sure you want to delete "${collection.name}"? Projects will not be deleted.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      deleteCollection(collection.id);
      await showToast({
        style: Toast.Style.Success,
        title: "Collection deleted",
      });
      refresh();
    }
  };

  const manualCollections = collections.filter((c) => c.type === "manual");
  const autoCollections = collections.filter((c) => c.type === "auto");

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search collections...">
      <List.Section title="Manual Collections">
        <List.Item
          title="Create Collection"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action
                title="Create Collection"
                icon={Icon.Plus}
                onAction={() => push(<CollectionForm onSave={refresh} />)}
              />
            </ActionPanel>
          }
        />
        {manualCollections.map((collection) => (
          <List.Item
            key={collection.id}
            title={collection.name}
            icon={
              collection.icon
                ? {
                    source:
                      Icon[collection.icon as keyof typeof Icon] || Icon.Folder,
                    tintColor: collection.color || Color.PrimaryText,
                  }
                : undefined
            }
            actions={
              <ActionPanel>
                <Action
                  title="Edit Collection"
                  icon={Icon.Pencil}
                  onAction={() =>
                    push(
                      <CollectionForm
                        collection={collection}
                        onSave={refresh}
                      />,
                    )
                  }
                />
                <Action
                  title="Delete Collection"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDelete(collection)}
                />
                <Action
                  title="Create Collection"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => push(<CollectionForm onSave={refresh} />)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title="Auto Collections">
        {autoCollections.map((collection) => (
          <List.Item
            key={collection.id}
            title={collection.name}
            subtitle="Auto-generated"
            icon={{
              source: Icon[collection.icon as keyof typeof Icon] || Icon.Folder,
              tintColor: Color.SecondaryText,
            }}
            accessories={[{ tag: "auto" }]}
          />
        ))}
      </List.Section>
    </List>
  );
}
