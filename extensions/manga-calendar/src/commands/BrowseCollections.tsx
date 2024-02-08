import CollectionGridItem from "@components/CollectionGridItem";
import { Grid } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Collection } from "@types";
import { scrapeCollections } from "@utils/scrapper";
import { useEffect, useState } from "react";

interface BrowseCollectionsProps {
  baseUrl: string;
}

export default function BrowseCollections({ baseUrl }: BrowseCollectionsProps) {
  const [collectionList, setCollectionList] = useState<Collection[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const { isLoading, data } = useFetch(baseUrl, {
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
      <Grid.Section title={`${collectionList.length} collections were found`}>
        {collectionList.map((collection) => (
          <CollectionGridItem key={collection.id} collection={collection} />
        ))}
      </Grid.Section>
    </Grid>
  );
}
