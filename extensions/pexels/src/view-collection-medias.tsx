import { List } from "@raycast/api";
import React, { useState } from "react";
import { getCollectionMedias } from "./hooks/hooks";
import { PhotosListItem } from "./utils/ui-component";
import { Photo } from "pexels";

export default function ViewCollectionMedias(props: { id: string; title: string }) {
  const { id, title } = props;
  const [page, setPage] = useState<number>(1);
  const { collectionMedias, loading } = getCollectionMedias(id, page);

  return (
    <List
      isShowingDetail={true}
      isLoading={loading}
      navigationTitle={title}
      searchBarPlaceholder={"Search photographers"}
      onSelectionChange={(id) => {
        if (typeof id !== "undefined") {
          const _id = collectionMedias?.media[collectionMedias?.media.length - 1]?.id + "";
          if (id === _id) {
            setPage(page + 1);
          }
        }
      }}
    >
      {collectionMedias?.media.map((pexelsPhoto, index) => {
        return <PhotosListItem key={index} pexelsPhoto={pexelsPhoto as Photo} index={index} />;
      })}
    </List>
  );
}
