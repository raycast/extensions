import { ActionPanel, Icon, List } from "@raycast/api";
import SearchInBrowserAction from "./SearchInBrowserAction";
import { FallbackSearchType } from "../types";

const Actions = (props: { searchText: string; fallbackSearchType: FallbackSearchType }) => (
  <ActionPanel>
    <SearchInBrowserAction searchText={props.searchText} fallbackSearchType={props.fallbackSearchType} />
  </ActionPanel>
);

// TODO: Use the `actions` prop on `<List>` component after we fixed a bug
export default function FallbackSearchSection(props: { searchText?: string; fallbackSearchType: FallbackSearchType }) {
  return props.searchText ? (
    <List.Section title="Fallback">
      <List.Item
        key="fallback-search"
        title={`Search for "${props.searchText}" in Safari`}
        icon={Icon.MagnifyingGlass}
        actions={<Actions searchText={props.searchText} fallbackSearchType={props.fallbackSearchType} />}
      />
    </List.Section>
  ) : null;
}
