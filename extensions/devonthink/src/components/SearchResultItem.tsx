import {Action, ActionPanel, List} from "@raycast/api";
import {SearchResult} from "../hooks/useSearch";

const SearchResultItem = ({ result }: {result: SearchResult}) => (
  <List.Item
    title={result.name}
    actions={<ActionPanel>
      <Action.Open title="Open in DEVONthink" target={`x-devonthink-item://${result.uuid}`} />
    </ActionPanel>}
  />
)

export default SearchResultItem;
