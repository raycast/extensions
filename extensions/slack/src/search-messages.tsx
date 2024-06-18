import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { format } from "date-fns";
import { useState } from "react";
import * as emoji from "node-emoji";

import { withSlackClient } from "./shared/withSlackClient";
import { getSlackWebClient } from "./shared/client/WebClient";
import { convertTimestampToDate, handleError } from "./shared/utils";
import { useChannels, useUsers } from "./shared/client";
import { SearchMessagesArguments } from "@slack/web-api";

function Search() {
  const [query, setQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("");
  const [sortType, setSortType] = useCachedState<SearchMessagesArguments["sort"]>("search-sort-type", "timestamp");

  const { data: users } = useUsers();
  const { data: channels } = useChannels();

  const { data, isLoading } = useCachedPromise(
    async (query, channel, sort) => {
      const webClient = getSlackWebClient();
      const results = await webClient.search.messages({
        query: `${query}${selectedChannel ? ` in:${channel}` : ""}`,
        sort,
      });
      return results.messages?.matches ?? [];
    },
    [query, selectedChannel, sortType],
    {
      onError(error) {
        handleError(error);
      },
      execute: query.length > 0,
      keepPreviousData: true,
    },
  );

  const sortOptions: { title: string; sort: SearchMessagesArguments["sort"] }[] = [
    { title: "Newest", sort: "timestamp" },
    { title: "Most Relevant", sort: "score" },
  ];

  const FromMeOnlyAction = () => (
    <Action
      title="From Me Only"
      icon={Icon.Person}
      onAction={() => setQuery(query ? `from:me ${query}` : "from:me ")}
    />
  );

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      actions={
        <ActionPanel>
          <FromMeOnlyAction />
        </ActionPanel>
      }
      throttle
      isShowingDetail
      searchBarAccessory={
        <List.Dropdown tooltip="Search Channels" onChange={setSelectedChannel} storeValue>
          <List.Dropdown.Item value="" title="All Channels" />

          <List.Dropdown.Section>
            {channels?.flat().map((c) => {
              return <List.Dropdown.Item key={c.id} icon={c.icon} value={c.name} title={c.name} />;
            })}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView title={query.length > 0 && !isLoading ? "No messages found" : "Search for Slack Messages"} />
      {data?.map((m) => {
        if (!m.text || !m.ts) return null;

        const user = users?.find((u) => u.id === m.user);
        const date = convertTimestampToDate(m.ts);
        const text = emoji.emojify(m.text);

        return (
          <List.Item
            key={m.iid}
            icon={{ value: user?.icon, tooltip: user?.name ?? "Unknown user" }}
            title={text}
            accessories={[{ date, tooltip: format(date, "EEEE dd MMMM yyyy 'at' HH:mm") }]}
            detail={<List.Item.Detail markdown={text} />}
            actions={
              <ActionPanel>
                {m.permalink ? <Action.OpenInBrowser url={m.permalink} title="Open Message" /> : null}

                <ActionPanel.Section>
                  <ActionPanel.Submenu title="Sort By" icon={Icon.ArrowUp}>
                    {sortOptions.map((s) => (
                      <Action
                        key={s.sort}
                        autoFocus={sortType === s.sort}
                        icon={sortType === s.sort ? Icon.CheckCircle : undefined}
                        title={s.title}
                        onAction={() => setSortType(s.sort)}
                      />
                    ))}
                  </ActionPanel.Submenu>

                  <FromMeOnlyAction />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default withSlackClient(Search);
