import { Action, ActionPanel, Icon, Image, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";
import { useMemo, useState } from "react";

import type { Message, SpaceItem } from "./api/types";
import { ChatView } from "./components/ChatView";
import { MessageActions } from "./components/MessageActions";
import { SpaceMessages } from "./components/SpaceMessages";
import { mentionNames, truncate } from "./helpers/chat-format";
import { spaceKind } from "./helpers/dm-names";
import { spaceNameOf } from "./helpers/recipient";
import { messageMarkdown, messageSnippet, senderName } from "./helpers/message-view";
import type { SearchMode } from "./helpers/search";
import { useSearchMessages } from "./hooks/useSearchMessages";
import { useSpaceItems } from "./hooks/useSpaceItems";

const MODES: { value: SearchMode; title: string }[] = [
  { value: "all", title: "All Messages" },
  { value: "unread", title: "Unread" },
  { value: "mentions", title: "Mentions Me" },
  { value: "links", title: "Has Link" },
];

function fallbackItem(spaceName: string): SpaceItem {
  return { space: { name: spaceName }, title: "Conversation", kind: spaceKind({}) };
}

function SearchMessages() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("all");
  const { data, isLoading, pagination, revalidate } = useSearchMessages(query, mode);
  const { items } = useSpaceItems();
  const spaces = useMemo(() => new Map(items.map((item) => [item.space.name, item])), [items]);

  function spaceFor(message: Message): SpaceItem {
    const name = message.space?.name ?? spaceNameOf(message.name);
    return spaces.get(name) ?? fallbackItem(name);
  }

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      filtering={false}
      throttle
      onSearchTextChange={setQuery}
      isShowingDetail={(data?.length ?? 0) > 0}
      searchBarPlaceholder="Search messages by keyword"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" storeValue onChange={(value) => setMode(value as SearchMode)}>
          {MODES.map((m) => (
            <List.Dropdown.Item key={m.value} title={m.title} value={m.value} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={isLoading ? "Searching…" : "No matching messages"}
        description="Search doesn't include muted spaces, app messages or app DMs."
        icon={Icon.MagnifyingGlass}
      />
      {data?.map((message) => {
        const item = spaceFor(message);
        const names = mentionNames(message);
        const sender = senderName(message, names);
        const snippet = messageSnippet(message, names);
        return (
          <List.Item
            key={message.name}
            title={truncate(snippet, 70)}
            icon={
              message.sender?.avatarUrl
                ? { source: message.sender.avatarUrl, mask: Image.Mask.Circle }
                : getAvatarIcon(sender)
            }
            accessories={[{ text: truncate(item.title, 20) }]}
            detail={<List.Item.Detail markdown={`### ${item.title}\n\n${messageMarkdown(message, names)}`} />}
            actions={
              <ActionPanel title={truncate(snippet, 40)}>
                <MessageActions
                  message={message}
                  space={item.space}
                  spaceTitle={item.title}
                  names={names}
                  onChange={revalidate}
                >
                  <Action.Push title="View Messages" icon={Icon.Bubble} target={<SpaceMessages item={item} />} />
                </MessageActions>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

export default function Command() {
  return (
    <ChatView>
      <SearchMessages />
    </ChatView>
  );
}
