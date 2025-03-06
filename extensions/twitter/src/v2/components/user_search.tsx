import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ReactElement, useState } from "react";
import { URL } from "url";
import { XIcon } from "../../icon";

function OpenSearchInBrowserAction(props: { search: string }): ReactElement {
  const url = new URL("https://twitter.com/search");
  url.searchParams.append("q", props.search);
  url.searchParams.append("f", "user");
  return <Action.OpenInBrowser title="Search on Twitter.com" icon={XIcon()} url={url.href} />;
}

function ListItemSearch(props: { search: string | undefined }): ReactElement | null {
  const s = props.search;
  if (!s || s.length <= 0) {
    return null;
  }
  return (
    <List.Item
      title={`Search '${s}' on twitter.com`}
      icon={XIcon()}
      actions={
        <ActionPanel>
          <OpenSearchInBrowserAction search={s} />
        </ActionPanel>
      }
    />
  );
}

export function SearchUserListV2(): ReactElement {
  const [search, setSearch] = useState<string>();
  // INFO search user via twitter.com because twitter v2 has no endpoint for user search
  return (
    <List
      searchText={search}
      onSearchTextChange={setSearch}
      searchBarPlaceholder="Search Users by Name or Handle (e.g. @tonka_2000 or Michael Aigner)"
    >
      <ListItemSearch search={search} />
      <List.EmptyView icon={Icon.Person} title="Search for a User on X.com" />
    </List>
  );
}
