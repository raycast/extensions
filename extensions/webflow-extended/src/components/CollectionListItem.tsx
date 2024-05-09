import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { Webflow } from "webflow-api";
import { getCMSItems } from "../webflow/client";
import { useEffect, useState } from "react";
import CollectionItemListItem from "./CollectionItemListItem";

export default function CollectionListItem(props: { staging: string; collection: Webflow.CollectionListArrayItem }) {
  const { staging, collection } = props;

  const name = collection.displayName ?? "Untitled Collection";
  const slug = collection.slug;

  return (
    <List.Item
      title={name}
      subtitle={slug}
      icon={{ source: Icon.HardDrive }}
      actions={
        <ActionPanel title={name}>
          <Action.Push
            title="Show Collection Items"
            icon={Icon.List}
            target={<ShowCollectionItems slug={slug ?? ""} staging={staging} collectionId={collection.id} />}
          />
        </ActionPanel>
      }
    />
  );
}

function ShowCollectionItems(props: { slug: string; staging: string; collectionId: string }) {
  const [searchText, setSearchText] = useState<string>();
  const [filteredItems, setFilteredItems] = useState<Webflow.CollectionItemList>();
  const [items, setItems] = useState<Webflow.CollectionItemList>();
  const response = getCMSItems(props.collectionId);

  if (response.error) {
    showToast(Toast.Style.Failure, "Failed to load site collections", response.error);
  }

  useEffect(() => {
    if (response.result) {
      setItems(response.result);
      setFilteredItems(response.result);
    }
  }, [response.result]);

  useEffect(() => {
    if (items) {
      const filtered = filteredItems?.items?.filter((item) => {
        return item.fieldData?.name?.toLowerCase().includes(searchText?.toLowerCase() ?? "");
      });
      setFilteredItems({ items: filtered });
    }
  }, [searchText]);

  return (
    <List
      searchBarPlaceholder="Search collections..."
      onSearchTextChange={setSearchText}
      isLoading={response.isLoading}
      throttle
    >
      {filteredItems?.items?.map((item) => (
        <CollectionItemListItem
          key={item.id}
          slug={props.slug}
          staging={props.staging}
          collectionId={props.collectionId}
          item={item}
        />
      ))}
    </List>
  );
}
