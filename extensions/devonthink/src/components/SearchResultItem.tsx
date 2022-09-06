import { Action, ActionPanel, List } from "@raycast/api";
import { SearchResult } from "../hooks/useSearch";

const SearchResultItem = ({ result }: { result: SearchResult }) => (
  <List.Item
    title={result.name}
    icon={{ fileIcon: result.path }}
    actions={
      <ActionPanel>
        <Action.Open title="Open in DEVONthink" target={`x-devonthink-item://${result.uuid}`} />
        <Action.Open title="Open in the default app" target={result.path} />
        <Action.Open title="Reveal in DEVONthink" target={`x-devonthink-item://${result.uuid}?reveal=1`} />
      </ActionPanel>
    }
    detail={<List.Item.Detail
      metadata={<List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label  title="Type" text={result.type} />
      </List.Item.Detail.Metadata>}
    />}
  />
);

export default SearchResultItem;
