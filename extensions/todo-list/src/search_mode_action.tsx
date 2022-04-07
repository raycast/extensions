import { Action, clearSearchBar, Icon, showToast, Toast } from "@raycast/api";
import { useAtom } from "jotai";
import { searchModeAtom } from "./atoms";

const SearchModeAction = () => {
  const [searchMode, setSearchMode] = useAtom(searchModeAtom);
  return (
    <Action
      title={`Switch to ${searchMode ? "insert" : "search"} mode`}
      onAction={async () => {
        await showToast(Toast.Style.Success, `Switched to ${searchMode ? "insert" : "search"} mode.`);
        setSearchMode(!searchMode);
        await clearSearchBar();
      }}
      icon={{ source: searchMode ? Icon.Pencil : Icon.MagnifyingGlass }}
      shortcut={{ key: "s", modifiers: ["cmd"] }}
    />
  );
};

export default SearchModeAction;
