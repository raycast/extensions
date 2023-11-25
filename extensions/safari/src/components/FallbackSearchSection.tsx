import { ActionPanel, Icon, List } from "@raycast/api";
import SearchInBrowserAction from "./SearchInBrowserAction";

const Actions = (props: { searchText: string }) => (
  <ActionPanel>
    <SearchInBrowserAction searchText={props.searchText} />
  </ActionPanel>
);

// TODO: Use the `actions` prop on `<List>` component after we fixed a bug
const FallbackSearchSection = (props: { searchText?: string }) =>
  props.searchText ? (
    <List.Section title="Fallback">
      <List.Item
        key="fallback-search"
        title={`Search for "${props.searchText}" in Safari`}
        icon={Icon.MagnifyingGlass}
        actions={<Actions searchText={props.searchText} />}
      />
    </List.Section>
  ) : null;

export default FallbackSearchSection;
