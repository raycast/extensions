import { shortcut } from "./shortcuts";
import { Action, clearSearchBar, Icon, showToast, Toast } from "@raycast/api";
import { useAtom } from "jotai";
import { searchModeAtom, searchBarTextAtom } from "./atoms";

const SearchModeAction = () => {
  const [searchMode, setSearchMode] = useAtom(searchModeAtom);
  const [, setSearchBarText] = useAtom(searchBarTextAtom);
  return (
    <Action
      icon={{ source: searchMode ? Icon.Pencil : Icon.MagnifyingGlass }}
      onAction={async () => {
        await showToast(Toast.Style.Success, `Switched to ${searchMode ? "insert" : "search"} mode.`);
        setSearchBarText("");
        setSearchMode(!searchMode);
        await clearSearchBar();
      }}
      shortcut={shortcut("s", ["cmd"])}
      // eslint-disable-next-line @raycast/prefer-title-case
      title={`Switch to ${searchMode ? "insert" : "search"} mode`}
    />
  );
};

export default SearchModeAction;
