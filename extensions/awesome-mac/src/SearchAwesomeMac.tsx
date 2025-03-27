import { List } from "@raycast/api";
import { AppListItem } from "./components/AppListItem";
import { useAppSearch } from "./hooks/useAppSearch";

export default function Command() {
  const { searchResults, isLoading, error, setSearchText } = useAppSearch();

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search apps by name, description, or category..."
      filtering={false} // We handle filtering manually
    >
      {error ? (
        <List.EmptyView title="Error" description={error.toString()} />
      ) : (
        searchResults.map((app, index) => <AppListItem key={index} app={app} />)
      )}
    </List>
  );
}
