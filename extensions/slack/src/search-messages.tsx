import { Action, ActionPanel, Color, Icon, List, showInFinder, showToast, Toast } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import * as emoji from "node-emoji";
import { SendMessage } from "./send-message";

import { withSlackClient } from "./shared/withSlackClient";
import { getSlackWebClient } from "./shared/client/WebClient";
import { downloadSlackFile } from "./shared/client/downloadFile";
import { convertTimestampToDate, handleError } from "./shared/utils";
import { useChannels, useMe, type User } from "./shared/client";
import { SearchMessagesArguments } from "@slack/web-api";

import { matchesAllWords } from "./shared/client/pagination";

type MatchFile = {
  id?: string;
  name?: string;
  title?: string;
  url_private_download?: string;
  url_private?: string;
};

async function downloadAttachment(file: MatchFile) {
  const url = file.url_private_download ?? file.url_private;
  if (!url) {
    await showToast({ style: Toast.Style.Failure, title: "Attachment has no downloadable URL" });
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading attachment" });
  try {
    const { path } = await downloadSlackFile({ url, filename: file.name ?? file.title ?? file.id ?? "attachment" });
    toast.style = Toast.Style.Success;
    toast.title = "Attachment downloaded";
    toast.message = path;
    await showInFinder(path);
  } catch (error) {
    toast.hide();
    await handleError(error, "Could not download attachment");
  }
}

function FromActions({
  users,
  meInfo,
  query,
  setQuery,
}: {
  users?: User[];
  meInfo?: User;
  query: string;
  setQuery: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  // Each message has an action panel. Materialize authors only in the opened submenu,
  // and cap its rows so large workspaces do not serialize the full directory per message.
  const choices = isOpen
    ? users?.filter((user) => matchesAllWords([user.name, user.username], searchText)).slice(0, 100)
    : [];
  return (
    <>
      <Action
        title="From Me Only"
        icon={meInfo?.icon ?? Icon.Person}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
        onAction={() => setQuery(query ? `from:me ${query}` : "from:me ")}
      />
      <ActionPanel.Submenu
        icon={Icon.Person}
        title="From"
        shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
        onOpen={() => setIsOpen(true)}
        onSearchTextChange={setSearchText}
        filtering={false}
      >
        {choices?.map((user) => (
          <Action
            key={user.id}
            title={user.name}
            icon={user.icon}
            onAction={() => setQuery(query ? `from:<@${user.id}> ${query}` : `from:<@${user.id}> `)}
          />
        ))}
      </ActionPanel.Submenu>
    </>
  );
}

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

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      actions={
        <ActionPanel>
          <FromActions users={users} meInfo={meInfo} query={query} setQuery={setQuery} />
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
        const files = ((m as { files?: MatchFile[] }).files ?? []).filter((file) => file.id);
        const date = convertTimestampToDate(m.ts);
        if (!Number.isFinite(date.getTime())) return null;
        const text = emoji.emojify(m.text);
        const formattedDate = format(date, "EEEE dd MMMM yyyy 'at' HH:mm");
        return (
          <List.Item
            key={m.iid}
            icon={{ value: user?.icon ?? Icon.Person, tooltip: user?.name ?? "Unknown user" }}
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
                    target={<SendMessage recipient={user.id} recipientName={user.name} />}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  />
                )}

                {files.length === 1 ? (
                  <Action
                    title="Download Attachment"
                    icon={Icon.Download}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "d" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "d" },
                    }}
                    onAction={() => downloadAttachment(files[0])}
                  />
                ) : files.length > 1 ? (
                  <ActionPanel.Submenu
                    title="Download Attachment"
                    icon={Icon.Download}
                    shortcut={{
                      macOS: { modifiers: ["cmd", "shift"], key: "d" },
                      Windows: { modifiers: ["ctrl", "shift"], key: "d" },
                    }}
                  >
                    {files.map((file, index) => (
                      <Action
                        key={file.id ?? index}
                        title={file.name ?? file.title ?? file.id ?? "Attachment"}
                        icon={Icon.Download}
                        onAction={() => downloadAttachment(file)}
                      />
                    ))}
                  </ActionPanel.Submenu>
                ) : null}

                <ActionPanel.Section>
                  <ActionPanel.Submenu
                    title="Sort by"
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

                  <FromActions users={users} meInfo={meInfo} query={query} setQuery={setQuery} />
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
