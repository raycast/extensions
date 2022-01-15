import { ActionPanel, clearSearchBar, Icon, showToast, ToastStyle } from "@raycast/api";
import { useAtom } from "jotai";
import { searchModeAtom } from "./atoms";

const SearchModeAction = () => {
  const [searchMode, setSearchMode] = useAtom(searchModeAtom);
  return (
    <ActionPanel.Item
      title={`Switch to ${searchMode ? "insert" : "search"} mode`}
      onAction={async () => {
        await showToast(ToastStyle.Success, `Switched to ${searchMode ? "insert" : "search"} mode.`);
        setSearchMode(!searchMode);
        await clearSearchBar();
      }}
      icon={{ source: searchMode ? Icon.Pencil : Icon.MagnifyingGlass }}
      shortcut={{ key: "s", modifiers: ["cmd"] }}
    />
  );
};

export default SearchModeAction;
