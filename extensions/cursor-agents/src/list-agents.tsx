import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { Agent, addFollowup, deleteAgent, getAgentConversation, useAgents } from "./cursor";
import { ensureProtocol, getAccessories, getStatusIcon, groupAgents, refreshMenuBar } from "./utils";

import { FormValidation, showFailureToast, useCachedPromise, useCachedState, useForm } from "@raycast/utils";
import { format } from "date-fns";

type ConversationMessage = {
  id: string;
  type: "user_message" | "assistant_message";
  text: string;
};

type MessageGroup = {
  userMessage: { id: string; text: string };
  assistantMessages: Array<{ id: string; text: string }>;
};

function groupConversationMessages(messages?: ConversationMessage[]): MessageGroup[] {
  const messageGroups: MessageGroup[] = [];
  let currentGroup: MessageGroup | null = null;

  messages?.forEach((msg) => {
    if (msg.type === "user_message") {
      // Start a new group when we encounter a user message
      if (currentGroup) {
        messageGroups.push(currentGroup);
      }
      currentGroup = {
        userMessage: { id: msg.id, text: msg.text },
        assistantMessages: [],
      };
    } else if (msg.type === "assistant_message" && currentGroup) {
      // Add assistant message to the current group
      currentGroup.assistantMessages.push({ id: msg.id, text: msg.text });
    }
  });

  // Don't forget to add the last group
  if (currentGroup) {
    messageGroups.push(currentGroup);
  }

  return messageGroups;
}

function FollowupInstruction(props: { agent: Agent }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ prompt: string }>({
    onSubmit: async (values) => {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Adding follow-up instruction" });
        await addFollowup(props.agent.id, {
          prompt: {
            text: values.prompt.trim(),
          },
        });

        await refreshMenuBar();

        await showToast({ style: Toast.Style.Success, title: "Added follow-up instruction" });
        pop();
      } catch (e) {
        await showFailureToast(e, { title: "Failed adding follow-up instruction" });
      }
    },
    validation: {
      prompt: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Follow-Up" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Prompt" placeholder="Give Cursor a follow-up instruction" {...itemProps.prompt} />
    </Form>
  );
}

function AgentConversation(props: { agent: Agent }) {
  const { data, isLoading } = useCachedPromise(getAgentConversation, [props.agent.id]);

  const messageGroups = groupConversationMessages(data?.messages);

  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle={`Conversation: ${props.agent.name}`}>
      <List.EmptyView
        title="No Conversation Yet"
        description="This agent hasn't started a conversation yet"
        icon={Icon.SpeechBubble}
      />
      {messageGroups.reverse().map((group, index) => {
        const assistantContent =
          group.assistantMessages.length > 0
            ? group.assistantMessages.map((msg) => msg.text).join("\n\n---\n\n")
            : "_Assistant is working on a response..._";

        return (
          <List.Item
            key={group.userMessage.id}
            title={group.userMessage.text}
            accessories={[{ text: `#${messageGroups.length - index}` }]}
            detail={<List.Item.Detail markdown={assistantContent} />}
          />
        );
      })}
    </List>
  );
}

function AgentDetail(props: { agent: Agent }) {
  const { agent } = props;

  return (
    <List.Item.Detail
      markdown={`## Summary\n\n${agent.summary || "_No summary available_"}`}
      metadata={
        <List.Item.Detail.Metadata>
          {agent.target.prUrl && (
            <>
              <List.Item.Detail.Metadata.Link
                title="Pull Request"
                text={agent.target.prUrl}
                target={agent.target.prUrl}
              />
              <List.Item.Detail.Metadata.Separator />
            </>
          )}
          <List.Item.Detail.Metadata.Link
            title="Repository"
            text={agent.source.repository}
            target={ensureProtocol(agent.source.repository)}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Created"
            text={format(agent.createdAt, "EEEE d MMMM yyyy 'at' HH:mm")}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function AgentListItem(props: {
  agent: Agent;
  mutate: () => Promise<void>;
  isShowingDetail: boolean;
  setIsShowingDetail: (value: boolean) => void;
}) {
  return (
    <List.Item
      id={props.agent.id}
      key={props.agent.id}
      title={props.agent.name}
      icon={getStatusIcon(props.agent)}
      accessories={getAccessories(props.agent, {
        hidePrUrl: props.isShowingDetail,
        hideRepository: props.isShowingDetail,
        hideStatus: props.isShowingDetail,
      })}
      detail={<AgentDetail agent={props.agent} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={props.agent.target.url} />
            <Action.Open
              icon={{ source: "icon-mono.svg", tintColor: Color.PrimaryText }}
              title="Open in Cursor"
              target={`cursor://anysphere.cursor-deeplink/background-agent?bcId=${encodeURIComponent(props.agent.id)}`}
            />
            {props.agent.target.prUrl && (
              <Action.OpenInBrowser
                icon={{ source: "pull-request-open.svg", tintColor: Color.PrimaryText }}
                title="Open Pull Request"
                url={props.agent.target.prUrl}
                shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Edit">
            <Action
              title="Create Agent"
              icon={Icon.PlusCircle}
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={() => launchCommand({ name: "launch-agent", type: LaunchType.UserInitiated })}
            />
            <Action.Push
              icon={Icon.SpeechBubble}
              title="Add Follow-Up"
              target={<FollowupInstruction agent={props.agent} />}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy URL"
              content={props.agent.target.url}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard
              title="Copy ID"
              content={props.agent.id}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
            {props.agent.target.prUrl && (
              <Action.CopyToClipboard
                title="Copy Pull Request URL"
                content={props.agent.target.prUrl}
                shortcut={Keyboard.Shortcut.Common.CopyPath}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="View">
            <Action
              title={props.isShowingDetail ? "Hide Details" : "Show Details"}
              icon={Icon.Sidebar}
              onAction={() => props.setIsShowingDetail(!props.isShowingDetail)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            />
            <Action.Push
              icon={Icon.Message}
              title="View Conversation"
              target={<AgentConversation agent={props.agent} />}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Others">
            <Action
              title="Delete Agent"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: "Delete Agent",
                  message: `Are you sure you want to delete "${props.agent.name}"? This action cannot be undone.`,
                  icon: Icon.Trash,
                  primaryAction: {
                    title: "Delete",
                    style: Alert.ActionStyle.Destructive,
                  },
                  dismissAction: {
                    title: "Cancel",
                    style: Alert.ActionStyle.Cancel,
                  },
                });

                if (confirmed) {
                  try {
                    await showToast({ style: Toast.Style.Animated, title: "Deleting agent" });
                    await deleteAgent(props.agent.id);
                    await props.mutate();
                    await showToast({ style: Toast.Style.Success, title: "Deleted agent" });
                  } catch (error) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed deleting agent",
                      message: error instanceof Error ? error.message : String(error),
                    });
                  }
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { data, isLoading, pagination, mutate } = useAgents();
  const [isShowingDetail, setIsShowingDetail] = useCachedState("isShowingDetail", false);

  const { today, yesterday, thisWeek, thisMonth, older } = groupAgents(data);

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      isShowingDetail={isShowingDetail}
      actions={
        <ActionPanel>
          <Action
            title="Create Agent"
            icon={Icon.PlusCircle}
            shortcut={Keyboard.Shortcut.Common.New}
            onAction={() => launchCommand({ name: "launch-agent", type: LaunchType.UserInitiated })}
          />
        </ActionPanel>
      }
    >
      <List.Section title="Today">
        {today.map((agent) => (
          <AgentListItem
            key={agent.id}
            agent={agent}
            mutate={mutate}
            isShowingDetail={isShowingDetail}
            setIsShowingDetail={setIsShowingDetail}
          />
        ))}
      </List.Section>
      <List.Section title="Yesterday">
        {yesterday.map((agent) => (
          <AgentListItem
            key={agent.id}
            agent={agent}
            mutate={mutate}
            isShowingDetail={isShowingDetail}
            setIsShowingDetail={setIsShowingDetail}
          />
        ))}
      </List.Section>
      <List.Section title="This Week">
        {thisWeek.map((agent) => (
          <AgentListItem
            key={agent.id}
            agent={agent}
            mutate={mutate}
            isShowingDetail={isShowingDetail}
            setIsShowingDetail={setIsShowingDetail}
          />
        ))}
      </List.Section>
      <List.Section title="This Month">
        {thisMonth.map((agent) => (
          <AgentListItem
            key={agent.id}
            agent={agent}
            mutate={mutate}
            isShowingDetail={isShowingDetail}
            setIsShowingDetail={setIsShowingDetail}
          />
        ))}
      </List.Section>
      <List.Section title="Older">
        {older.map((agent) => (
          <AgentListItem
            key={agent.id}
            agent={agent}
            mutate={mutate}
            isShowingDetail={isShowingDetail}
            setIsShowingDetail={setIsShowingDetail}
          />
        ))}
      </List.Section>
    </List>
  );
}
