import { Action, ActionPanel, Icon, List } from "@raycast/api";
import React, { useState } from "react";
import { ActionToPexels } from "./utils/ui-component";
import { getCollections } from "./hooks/hooks";
import ViewCollectionMedias from "./view-collection-medias";
import { commonPreferences, isEmpty } from "./utils/common-utils";
import { collectionTags } from "./utils/costants";

export default function SearchCollections() {
  const { rememberTag } = commonPreferences();
  const [page, setPage] = useState<number>(1);
  const [collectionTag, setCollectionTag] = useState<string>("");
  const { collections, loading } = getCollections(collectionTag, page);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={"Search collections"}
      onSelectionChange={(id) => {
        if (typeof id !== "undefined") {
          const _id = collections[collections.length - 1]?.id + "";
          if (id === _id) {
            setPage(page + 1);
          }
        }
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Collection Tags"
          storeValue={rememberTag}
          onChange={(newValue) => {
            setCollectionTag(newValue);
          }}
        >
          {collectionTags.map((value) => {
            return <List.Dropdown.Item key={value.value} title={value.title} value={value.value} />;
          })}
        </List.Dropdown>
      }
    >
      {!loading && collections?.length === 0 ? (
        <List.EmptyView
          title={"Welcome to Pexels"}
          icon={"empty-view-icon.png"}
          actions={
            <ActionPanel>
              <ActionToPexels />
            </ActionPanel>
          }
        />
      ) : (
        collections?.map((collection) => {
          return (
            <List.Item
              id={collection.id + ""}
              key={collection.id + ""}
              icon={{ source: "collection-icon.png" }}
              title={collection.title}
              subtitle={isEmpty(collection.description) ? "" : collection.description + ""}
              accessories={[{ text: `${collection.photos_count} Photos` }]}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.Terminal}
                    title={"View Collections"}
                    target={<ViewCollectionMedias id={collection.id} title={collection.title} />}
                  />
                  <ActionToPexels />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
