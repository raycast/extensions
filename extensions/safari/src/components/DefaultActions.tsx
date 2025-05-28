import { ActionPanel } from "@raycast/api";
import SearchInBrowserAction from "./SearchInBrowserAction";

export default function DefaultActions(props: { searchText: string }) {
  return (
    <ActionPanel>
      <SearchInBrowserAction searchText={props.searchText} />
    </ActionPanel>
  );
}
