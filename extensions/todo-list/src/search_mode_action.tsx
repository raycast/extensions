import { Action, clearSearchBar, Icon, showToast, Toast } from "@raycast/api";
import { useAtom } from "jotai";
import { searchModeAtom } from "./atoms";

const SearchModeAction = () => {
  const [searchMode, setSearchMode] = useAtom(searchModeAtom);
  return (
    <Action
      icon={{ source: searchMode ? Icon.Pencil : Icon.MagnifyingGlass }}
      onAction={async () => {
        await showToast(Toast.Style.Success, `Switched to ${searchMode ? "insert" : "search"} mode.`);
        setSearchMode(!searchMode);
        await clearSearchBar();
      }}
      shortcut={{ key: "s", modifiers: ["cmd"] }}
      title={`Switch to ${searchMode ? "insert" : "search"} mode`}
    />
  );
};

export default SearchModeAction;
