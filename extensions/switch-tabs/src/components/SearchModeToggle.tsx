import { Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { getActionShortcut } from "../helpers";

interface SearchModeActionProps {
  currentSearchMode: "filter" | "search";
  setManualSearchMode: (mode: "filter" | "search") => void;
  searchText?: string;
  setSearchText?: (text: string) => void;
}

export const SearchModeAction = (props: SearchModeActionProps) => {
  const { currentSearchMode, setManualSearchMode, searchText, setSearchText } =
    props;

  const isSearch = currentSearchMode === "search";
  const hasText = searchText && searchText.trim().length > 0;

  return (
    <>
      {hasText && setSearchText && (
        <Action
          title={
            currentSearchMode === "filter"
              ? "Clear Filter Text"
              : "Clear Search Text"
          }
          icon={{ source: Icon.Eraser, tintColor: Color.Magenta }}
          shortcut={
            getActionShortcut("clearSearch") || { modifiers: [], key: "'" }
          }
          onAction={() => {
            setSearchText("");
            showToast({
              style: Toast.Style.Success,
              title:
                currentSearchMode === "filter"
                  ? "Filter cleared"
                  : "Search cleared",
            });
          }}
        />
      )}
      <Action
        title={isSearch ? "Switch to Filter Mode" : "Switch to Search Mode"}
        icon={{
          source: isSearch ? Icon.Filter : Icon.MagnifyingGlass,
          tintColor: Color.Magenta,
        }}
        shortcut={getActionShortcut("searchToggle")}
        onAction={() => {
          const nextMode = isSearch ? "filter" : "search";
          setManualSearchMode(nextMode);
        }}
      />
    </>
  );
};
