import { List, showToast, Toast } from "@raycast/api";
import { useState, ReactElement } from "react";
import { VivaldiListsItems } from "./components";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";
import { DEFAULT_ERROR_TITLE, VIVALDI_NOT_INSTALLED_MESSAGE } from "./constants";
import { NotInstalled } from "./components/NotInstalled";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, error, data } = useBookmarkSearch(searchText);

  if (error) {
    if (error === VIVALDI_NOT_INSTALLED_MESSAGE) {
      return <NotInstalled />;
    }
    showToast(Toast.Style.Failure, DEFAULT_ERROR_TITLE, error.toString());
  }

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading} throttle={true}>
      {data?.map((e) => (
        <VivaldiListsItems.TabHistory entry={e} key={e.id} />
      ))}
    </List>
  );
}
