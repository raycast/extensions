import { ListItem } from "@components/ListItem";
import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { GraphicPublication } from "@types";
import { getMangaCollection } from "@utils/scrapper";
import { useEffect, useState } from "react";

interface Props {
  url: string;
  title: string;
}

export function CollectionListView({ url, title }: Props) {
  const { isLoading, data } = useFetch(url);
  const [publicationsList, setPublicationsList] = useState<GraphicPublication[]>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [showingDetail, setShowingDetail] = useState<boolean>(false);

  useEffect(() => {
    if (data) {
      getMangaCollection(String(data)).then((result) => setPublicationsList(result));
    }
  }, [data]);

  return (
    <List
      isShowingDetail={showingDetail}
      isLoading={isLoading}
      searchText={searchText}
      navigationTitle={`Viewing: ${title}`}
      onSearchTextChange={setSearchText}
      filtering
    >
      {publicationsList.map((publication: GraphicPublication) => {
        return (
          <ListItem
            key={publication.id}
            publication={publication}
            isShowingDetail={showingDetail}
            handleAction={setShowingDetail}
          />
        );
      })}
    </List>
  );
}
