import { Grid } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Collection } from "../types";
import { scrapeCollections } from "../utils/scrapper";
import CollectionGridItem from "../components/CollectionGridItem";

export default function CurrentMonthPublications() {
  const [collectionList, setCollectionList] = useState<Collection[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const { isLoading, data } = useFetch("https://miscomics.com.mx/manga", {
    keepPreviousData: true,
  });

  useEffect(() => {
    scrapeCollections(String(data) || "").then((result) => setCollectionList(result));
  }, [data]);

  return (
    <Grid
      navigationTitle={`${collectionList.length} Manga collections were found`}
      isLoading={isLoading}
      columns={5}
      inset={Grid.Inset.Small}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={true}
    >
      {collectionList.map((collection, idx) => (
        <CollectionGridItem key={idx + collection.name} collection={collection} />
      ))}
    </Grid>
  );
}
