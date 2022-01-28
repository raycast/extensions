import { ActionPanel, closeMainWindow, Icon } from "@raycast/api";

import { executeJxa } from "../utils";

const searchInBrowser = async (searchText?: string) => {
  if (!searchText) {
    console.error("No search text provided");
    return;
  }

  executeJxa(`
      const safari = Application("Safari");
      safari.searchTheWeb({ for: "${searchText}" });
      safari.activate();
  `);
};

const SearchInBrowserAction = (props: { searchText?: string }) => {
  return props.searchText ? (
    <ActionPanel.Item
      title="Search in Browser"
      icon={Icon.MagnifyingGlass}
      onAction={async () => {
        await searchInBrowser(props.searchText);
        await closeMainWindow({ clearRootSearch: true });
      }}
    />
  ) : null;
};

export default SearchInBrowserAction;
