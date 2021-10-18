import { ActionPanel, Color, Icon, List, PushAction, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect } from "react";
import { MarkAsReadAction } from "./commonActions";
import { MessagesList } from "./messagesList";
import { ConversationInfo, ListViewModel, slackService } from "./slackClient";

import { dateDescription } from "./utils";

export default function ConversationsList(): JSX.Element {
  const [model, setModel] = useState<ListViewModel | undefined>(undefined);

  useEffect(() => {
    slackService
      .cachedConversations()
      .then((cachedModel) => {
        if (!model || (model && model.isLoading)) {
          setModel(cachedModel);
        }
      })
      .catch(console.error);

    slackService
      .useListViewModel()
      .then(setModel)
      .catch((error) => {
        if (!model || (model && model.isLoading)) {
          setModel((prevState) => ({
            ...prevState,
            isLoading: false,
          }));
        }
        console.error(error);
        return showToast(ToastStyle.Failure, "An error occurred while fetching conversations", error);
      });
  }, []);

  return (
    <List isLoading={model?.isLoading} searchBarPlaceholder="Filter channels by name...">
      <List.Section title="Channels">
        {model?.channels?.map((channel) => (
          <ChannelListItem key={channel.id} conversation={channel} />
        ))}
      </List.Section>

      <List.Section title="Direct">
        {model?.directs?.map((channel) => (
          <ChannelListItem key={channel.id} conversation={channel} />
        ))}
      </List.Section>

      <List.Section title="Multiparty">
        {model?.multiparty?.map((channel) => (
          <ChannelListItem key={channel.id} conversation={channel} />
        ))}
      </List.Section>

      <List.Section title="Private">
        {model?.privateGroups?.map((channel) => (
          <ChannelListItem key={channel.id} conversation={channel} />
        ))}
      </List.Section>
    </List>
  );
}

function ChannelListItem(props: { conversation: ConversationInfo }) {
  const channel = props.conversation;
  return (
    <List.Item
      id={channel.id}
      key={channel.id}
      title={channel.name ?? "Unnamed"}
      subtitle={`${channel.hasMoreThen100Unreads ? "100+" : channel.messages?.length} messages`}
      icon="hashtag-16.png"
      accessoryTitle={dateDescription(channel.lastMessageDate)}
      actions={
        <ActionPanel title={`#${channel.name}`}>
          {channel.messages && channel.messages.length > 0 ? (
            <PushAction title="Go to Messages" icon={Icon.Message} target={<MessagesList conversation={channel} />} />
          ) : null}
          {channel.hasUnread ? <MarkAsReadAction conversation={channel} /> : null}
          <MarkAllAsReadAction />
        </ActionPanel>
      }
    />
  );
}

function MarkAllAsReadAction() {
  return (
    <ActionPanel.Item
      title="Mark All as Read"
      icon={{ source: Icon.Checkmark, tintColor: Color.Red }}
      onAction={async () => {
        showToast(ToastStyle.Animated, `Marking All as Read`);
        await slackService.markAllAsRead();
        showToast(ToastStyle.Success, `Marked as Read`);
      }}
    />
  );
}
