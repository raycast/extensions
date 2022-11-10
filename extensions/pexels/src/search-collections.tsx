import { Color, environment, getPreferenceValues, Grid, List } from "@raycast/api";
import React, { useState } from "react";
import { getCollections } from "./hooks/hooks";
import { isEmpty } from "./utils/common-utils";
import { collectionTags } from "./utils/costants";
import { PexelsEmptyView } from "./components/pexels-empty-view";
import { Preferences } from "./types/preferences";
import { ActionOnCollection } from "./components/action-on-collection";

export default function SearchCollections() {
  const { rememberTag, layout } = getPreferenceValues<Preferences>();
  const raycastTheme = environment.theme;
  const perPage = layout === "List" ? 15 : 24;
  const [page, setPage] = useState<number>(1);
  const [collectionTag, setCollectionTag] = useState<string>("");
  const { collections, loading } = getCollections(collectionTag, page, perPage);

  return layout === "List" ? (
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
      <PexelsEmptyView title={"No Collections"} layout={"List"} />
      {collections?.map((collection) => {
        return (
          <List.Item
            id={collection.id + ""}
            key={collection.id + ""}
            icon={{ source: "collection-icon.png" }}
            title={collection.title}
            subtitle={isEmpty(collection.description) ? "" : collection.description + ""}
            accessories={[{ text: `${collection.photos_count} Photos`, tooltip: `${collection.photos_count} Photos` }]}
            actions={<ActionOnCollection collection={collection} />}
          />
        );
      })}
    </List>
  ) : (
    <Grid
      itemSize={Grid.ItemSize.Small}
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
        <Grid.Dropdown
          tooltip="Collection Tags"
          storeValue={rememberTag}
          onChange={(newValue) => {
            setCollectionTag(newValue);
          }}
        >
          {collectionTags.map((value) => {
            return <Grid.Dropdown.Item key={value.value} title={value.title} value={value.value} />;
          })}
        </Grid.Dropdown>
      }
    >
      <PexelsEmptyView title={"No Collections"} layout={"Grid"} />
      {collections?.map((collection) => {
        return (
          <Grid.Item
            id={collection.id + ""}
            key={collection.id + ""}
            content={{
              value: raycastTheme === "light" ? "collection-grid-icon.png" : "collection-grid-icon@dark.png",
              tooltip: isEmpty(collection.description) ? "" : collection.description + "",
            }}
            title={collection.title}
            subtitle={`${collection.photos_count} Photos`}
            actions={<ActionOnCollection collection={collection} />}
          />
        );
      })}
    </Grid>
  );
}
