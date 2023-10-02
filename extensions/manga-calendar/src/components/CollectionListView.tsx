import { useFetch } from "@raycast/utils";
import { Manga } from "../types";
import MangaListItem from "./MangaListItem";
import { useEffect, useState } from "react";
import { getMangaCollection } from "../utils/scrapper";
import { List } from "@raycast/api";

interface Props {
  url: string;
  title: string;
}

export function CollectionListView({ url, title }: Props) {
  const { isLoading, data } = useFetch(url);
  const [mangaList, setMangaList] = useState<Manga[]>([]);
  const [searchText, setSearchText] = useState<string>("");

  useEffect(() => {
    if (data) {
      getMangaCollection(String(data)).then((result) => setMangaList(result));
    }
  }, [data]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      navigationTitle={`Viewing: ${title}`}
      onSearchTextChange={setSearchText}
      filtering
    >
      {mangaList.map((manga) => (
        <MangaListItem key={manga.id} manga={manga} />
      ))}
    </List>
  );
}
