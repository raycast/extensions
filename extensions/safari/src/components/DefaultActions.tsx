import { ActionPanel } from "@raycast/api";

import SearchInBrowserAction from "./SearchInBrowserAction";

const DefaultActions = (props: { searchText: string }) => (
  <ActionPanel>
    <SearchInBrowserAction searchText={props.searchText} />
  </ActionPanel>
);

export default DefaultActions;
