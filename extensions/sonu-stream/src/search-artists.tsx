import { List } from "@raycast/api";
import { ErrorDetail } from "./components/error-detail";
import { ArtistListItem } from "./components/artist-list-item";
import { Artist } from "./common/types";
import { useFetchSearch } from "./hooks/use-fetch-search";

export default function SearchArtistsCommand() {
  const { data, isLoading, error, setSearchText } = useFetchSearch<Artist>({ collection: "artists" });
  if (error) return <ErrorDetail />;

  return (
    <List
      isLoading={isLoading}
      throttle={true}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search for an Artist"
      isShowingDetail={Boolean(data)}
    >
      {!data && <List.EmptyView description={`Search for an Artist`} />}
      {data &&
        data.hits
          ?.filter((hit) => Boolean(hit?.document))
          .map(({ document }) => <ArtistListItem artist={document} key={document.id} />)}
    </List>
  );
}
