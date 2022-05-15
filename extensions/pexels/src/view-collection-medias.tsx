import { List } from "@raycast/api";
import React, { useState } from "react";
import { getCollectionMedias } from "./hooks/hooks";
import { PhotosListItem } from "./components/photos-list-item";
import { Photo } from "pexels";
import { PexelsEmptyView } from "./components/pexels-empty-view";

export default function ViewCollectionMedias(props: { id: string; title: string }) {
  const { id, title } = props;
  const [page, setPage] = useState<number>(1);
  const { collectionMedias, loading } = getCollectionMedias(id, page);

  return (
    <List
      isShowingDetail={collectionMedias.length !== 0}
      isLoading={loading}
      navigationTitle={title}
      searchBarPlaceholder={"Search photographers"}
      onSelectionChange={(id) => {
        if (typeof id !== "undefined") {
          const _id = collectionMedias?.length - 1 + "_" + collectionMedias[collectionMedias.length - 1]?.id + "";
          if (id === _id) {
            setPage(page + 1);
          }
        }
      }}
    >
      <PexelsEmptyView title={"No Photos"} />
      {collectionMedias.map((pexelsPhoto, index) => {
        return <PhotosListItem key={index} pexelsPhoto={pexelsPhoto as Photo} index={index} />;
      })}
    </List>
  );
}
