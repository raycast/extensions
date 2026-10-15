import { ActionPanel, Image, List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";

import type { Message, SpaceItem } from "../api/types";
import { messageMarkdown, messageSnippet, senderName } from "../helpers/message-view";
import { truncate } from "../helpers/chat-format";
import { spaceUrl } from "../helpers/links";
import { useMessages } from "../hooks/useMessages";
import { useUserNames } from "../hooks/useUserNames";
import { MessageActions } from "./MessageActions";
import { OpenInChatAction } from "./OpenInChatAction";

function senderIcon(message: Message, name: string): Image.ImageLike {
  return message.sender?.avatarUrl
    ? { source: message.sender.avatarUrl, mask: Image.Mask.Circle }
    : getAvatarIcon(name);
}

/** Messages in one space, newest first, with the selected message in the detail pane. */
export function SpaceMessages({ item }: { item: SpaceItem }) {
  const { data, isLoading, pagination, revalidate } = useMessages(item.space.name);
  const names = useUserNames(item.space);

  return (
    <List
      navigationTitle={item.title}
      isLoading={isLoading}
      pagination={pagination}
      isShowingDetail={(data?.length ?? 0) > 0}
      searchBarPlaceholder={`Filter loaded messages in ${item.title}`}
    >
      <List.EmptyView
        title={isLoading ? "Loading messages…" : "No messages"}
        actions={
          <ActionPanel>
            <OpenInChatAction url={spaceUrl(item.space)} />
          </ActionPanel>
        }
      />
      {data?.map((message) => {
        const sender = senderName(message, names);
        const snippet = messageSnippet(message, names);
        return (
          <List.Item
            key={message.name}
            title={truncate(snippet, 80)}
            keywords={[sender]}
            icon={senderIcon(message, sender)}
            detail={<List.Item.Detail markdown={messageMarkdown(message, names)} />}
            actions={
              <ActionPanel title={truncate(snippet, 40)}>
                <MessageActions
                  message={message}
                  space={item.space}
                  spaceTitle={item.title}
                  names={names}
                  onChange={revalidate}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
