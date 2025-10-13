import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import * as emoji from "node-emoji";
import { SendMessage } from "./send-message";

import { withSlackClient } from "./shared/withSlackClient";
import { getSlackWebClient } from "./shared/client/WebClient";
import { convertTimestampToDate, handleError } from "./shared/utils";
import { useChannels, useMe } from "./shared/client";
import { SearchMessagesArguments } from "@slack/web-api";

function Search() {
  const [query, setQuery] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("");

  const [sortType, setSortType] = useCachedState<SearchMessagesArguments["sort"]>("search-sort-type", "timestamp");

  const { data: me } = useMe();
  const { data: channels } = useChannels();
  const users = channels?.[0];

  const meInfo = users?.find((u) => u.id === me?.id);

  const { data, isLoading } = useCachedPromise(
    async (query, channel, sort) => {
      const webClient = getSlackWebClient();

      const results = await webClient.search.messages({
        query: `${query}${channel ? ` in:${channel}` : ""}`,
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

  const FromActions = () => (
    <>
      <Action
        title="From Me Only"
        icon={meInfo ? meInfo.icon : Icon.Person}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
        onAction={() => setQuery(query ? `from:me ${query}` : "from:me ")}
      />

      <ActionPanel.Submenu icon={Icon.Person} title="From" shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}>
        {users?.map((u) => (
          <Action
            key={u.id}
            title={u.name}
            icon={u.icon}
            onAction={() => setQuery(query ? `from:<@${u.id}> ${query}` : `from:<@${u.id}> `)}
          />
        ))}
      </ActionPanel.Submenu>
    </>
  );

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      actions={
        <ActionPanel>
          <FromActions />
        </ActionPanel>
      }
      throttle
      isShowingDetail={data && data.length > 0}
      searchBarAccessory={
        <List.Dropdown tooltip="Search Channels" onChange={setSelectedChannel}>
          <List.Dropdown.Item value="" title="All Channels" />
          {channels ? (
            <List.Dropdown.Section>
              {channels.flat().map((c) => {
                return (
                  <List.Dropdown.Item
                    key={c.id}
                    icon={c.icon}
                    value={"username" in c ? c.username : "groupName" in c ? c.groupName : c.name}
                    title={c.name}
                  />
                );
              })}
            </List.Dropdown.Section>
          ) : null}
        </List.Dropdown>
      }
    >
      {data === undefined ? (
        <List.EmptyView
          title="Search Slack messages"
          description="Type something in the search bar to start searching."
        />
      ) : null}
      {data?.map((m) => {
        if (!m.text || !m.ts) return null;
        const user = users?.find((u) => u.id === m.user);
        const date = convertTimestampToDate(m.ts);
        const text = emoji.emojify(m.text);
        const formattedDate = format(date, "EEEE dd MMMM yyyy 'at' HH:mm");
        return (
          <List.Item
            key={m.iid}
            icon={{ value: user?.icon, tooltip: user?.name ?? "Unknown user" }}
            title={text}
            accessories={[{ date, tooltip: formattedDate }]}
            detail={
              <List.Item.Detail
                markdown={text}
                metadata={
                  <List.Item.Detail.Metadata>
                    {m.type === "message" && m.channel ? (
                      <List.Item.Detail.Metadata.Label title="Channel Name" icon={Icon.Hashtag} text={m.channel.name} />
                    ) : null}

                    {user ? <List.Item.Detail.Metadata.Label title="From" icon={user.icon} text={user.name} /> : null}

                    <List.Item.Detail.Metadata.Label
                      title="Posted"
                      icon={Icon.Clock}
                      text={formatDistanceToNow(date)}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                {m.permalink ? <Action.OpenInBrowser url={m.permalink} title="Open Message" /> : null}

                {m.permalink ? (
                  <Action.CopyToClipboard
                    content={m.permalink}
                    title="Copy Message URL"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                ) : null}

                {user && (
                  <Action.Push
                    title={`Message ${user.name}`}
                    icon={Icon.Message}
                    target={<SendMessage recipient={user?.id} />}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  />
                )}

                <ActionPanel.Section>
                  <ActionPanel.Submenu
                    title="Sort By"
                    icon={Icon.ArrowUp}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  >
                    {sortOptions.map((s) => (
                      <Action
                        key={s.sort}
                        autoFocus={sortType === s.sort}
                        icon={sortType === s.sort ? { source: Icon.CheckCircle, tintColor: Color.Green } : undefined}
                        title={s.title}
                        onAction={() => setSortType(s.sort)}
                      />
                    ))}
                  </ActionPanel.Submenu>

                  <FromActions />
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
