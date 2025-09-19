import { ActionPanel, Action, List, Icon } from "@raycast/api";
import ReceivedMessages from "./received-messages";
import SentMessages from "./sent-messages";
import PinnedMessages from "./pinned-messages";

interface Option {
  id: string;
  title: string;
  description: string;
  icon: Icon;
  component: React.ComponentType;
}

const conversationOptions: Option[] = [
  {
    id: "received-messages",
    title: "Claude's Responses",
    description: "View messages you received from Claude",
    icon: Icon.Message,
    component: ReceivedMessages,
  },
  {
    id: "sent-messages",
    title: "My Sent Messages",
    description: "View messages you sent to Claude",
    icon: Icon.Message,
    component: SentMessages,
  },
];

const pinnedOptions: Option[] = [
  {
    id: "pinned-messages",
    title: "Pinned Messages",
    description: "View your pinned Claude messages",
    icon: Icon.Pin,
    component: PinnedMessages,
  },
];

export default function ClaudeCodeHelper() {
  return (
    <List searchBarPlaceholder="Search Claude Code helper options...">
      <List.Section title="Pinned">
        {pinnedOptions.map((option) => (
          <List.Item
            key={option.id}
            title={option.title}
            subtitle={option.description}
            icon={option.icon}
            actions={
              <ActionPanel>
                <Action.Push title="Open" target={<option.component />} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Conversations">
        {conversationOptions.map((option) => (
          <List.Item
            key={option.id}
            title={option.title}
            subtitle={option.description}
            icon={option.icon}
            actions={
              <ActionPanel>
                <Action.Push title="Open" target={<option.component />} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
