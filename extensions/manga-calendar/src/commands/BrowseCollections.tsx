import { Grid } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { Collection } from "../types";
import { scrapeCollections } from "../utils/scrapper";
import CollectionGridItem from "../components/CollectionGridItem";

export default function BrowseCollections() {
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
      isLoading={isLoading}
      columns={6}
      aspectRatio="2/3"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={true}
    >
      <Grid.Section title={`${collectionList.length} Manga collections were found`}>
        {collectionList.map((collection) => (
          <CollectionGridItem key={collection.id} collection={collection} />
        ))}
      </Grid.Section>
    </Grid>
  );
}
