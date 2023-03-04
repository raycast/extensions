import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useMasto } from "./hooks/masto";
import { useState } from "react";
import { usePromise } from "@raycast/utils";
import type { mastodon } from "masto";
import AccountItem from "./components/AccountItem";
import StatusItem from "./components/StatusItem";

type Search = mastodon.v1.Search;
type SearchType = mastodon.v1.SearchType;

const EMPTY_RESULT = { accounts: [], hashtags: [], statuses: [] };

export default function Search() {
  const masto = useMasto();

  const [query, setQuery] = useState("");
  const [type, setType] = useState<SearchType | null>(null);
  const { data, isLoading, revalidate } = usePromise(
    async (q: string, type: SearchType | null) => {
      if (!(q && masto)) return EMPTY_RESULT;
      return await masto?.v2.search({ q, type });
    },
    [query, type]
  );

  return (
    <List
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter down to specific type."
          storeValue
          onChange={(v) => setType((v as SearchType) || null)}
        >
          <List.Dropdown.Item key="none" value={""} title="All" />
          <List.Dropdown.Item key="accounts" value="accounts" title="Accounts" icon={Icon.Person} />
          <List.Dropdown.Item key="hashtags" value="hashtags" title="Hashtags" icon={Icon.Hashtag} />
          <List.Dropdown.Item key="statuses" value="statuses" title="Statuses" icon={Icon.Message} />
        </List.Dropdown>
      }
      isLoading={!masto || isLoading}
      isShowingDetail={type === "statuses"}
    >
      <List.Section title="Accounts">
        {data?.accounts.map((account) => (
          <AccountItem key={account.id} account={account} />
        ))}
      </List.Section>
      <List.Section title="Statuses">
        {data?.statuses.map((status) => (
          <StatusItem key={status.id} status={status} revalidate={revalidate} />
        ))}
      </List.Section>
      <List.Section title="Hashtags">
        {data?.hashtags.map((tag) => (
          <List.Item
            key={tag.name}
            title={"#" + tag.name}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={tag.url} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
