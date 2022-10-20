import { Action, ActionPanel, List } from "@raycast/api";
import { ReactElement, useState } from "react";
import { URL } from "url";

export enum SEARCH_TYPE {
  LATEST_TWEETS,
  TOP_TWEETS,
  USER,
}

type OpenSearchInBrowserActionProps = {
  search: string;
  searchType: SEARCH_TYPE;
};

function OpenSearchInBrowserAction({ search, searchType }: OpenSearchInBrowserActionProps): ReactElement {
  const url = new URL("https://twitter.com/search");

  url.searchParams.append("q", search);
  if (searchType === SEARCH_TYPE.LATEST_TWEETS) {
    url.searchParams.append("f", "live");
  }
  if (searchType === SEARCH_TYPE.USER) {
    url.searchParams.append("f", "user");
  }

  return <Action.OpenInBrowser title="Search on Twitter.com" icon="twitter.png" url={url.href} />;
}

type ListItemSearchProps = {
  search: string | undefined;
  searchType: SEARCH_TYPE;
};

function ListItemSearch({ search, searchType }: ListItemSearchProps): ReactElement | null {
  if (!search || search.length <= 0) {
    return null;
  }

  return (
    <List.Item
      title={`Search '${search}' on twitter.com`}
      icon="twitter.png"
      actions={
        <ActionPanel>
          <OpenSearchInBrowserAction search={search} searchType={searchType} />
        </ActionPanel>
      }
    />
  );
}

type SearchListV2Props = {
  searchBarPlaceholder: string;
  searchType: SEARCH_TYPE;
};

export function SearchListV2({ searchBarPlaceholder, searchType }: SearchListV2Props): ReactElement {
  const [search, setSearch] = useState<string>();
  // INFO search user via twitter.com because twitter v2 has no endpoint for user search
  return (
    <List searchText={search} onSearchTextChange={setSearch} searchBarPlaceholder={searchBarPlaceholder}>
      <ListItemSearch search={search} searchType={searchType} />
    </List>
  );
}
