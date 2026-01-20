import {
  ActionPanel,
  List,
  Action,
  getPreferenceValues,
  showToast,
  Toast,
  useNavigation,
  Form,
  Icon,
  Color,
} from "@raycast/api";
import { useFetch, showFailureToast } from "@raycast/utils";
import { useState, useEffect, useMemo } from "react";
import { useSources, Preferences, API_BASE_URL, API_KEY_ERROR_MESSAGE } from "./api";

type Session = {
  name: string;
  id: string;
  title: string;
  state: string;
  url: string;
  prompt: string;
  sourceContext: {
    source: string;
  };
};

type SessionsResponse = {
  sessions: Session[];
  nextPageToken?: string;
};

type Activity = {
  name: string;
  id: string;
  description: string;
  createTime: string;
  originator: string;
  agentMessaged?: { agentMessage: string };
  userMessaged?: { userMessage: string };
  planGenerated?: { plan: { steps: { title: string }[] } };
  progressUpdated?: { title: string; description: string };
  sessionCompleted?: Record<string, never>;
  sessionFailed?: { reason: string };
};

type ActivitiesResponse = {
  activities: Activity[];
  nextPageToken?: string;
};

function SendMessageForm({
  session,
  onMessageSent,
  lastActivity,
}: {
  session: Session;
  onMessageSent: () => void;
  lastActivity?: Activity;
}) {
  const preferences = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { message: string }) {
    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Sending message..." });

    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${session.id}:sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": preferences.julesApiKey,
        },
        body: JSON.stringify({
          prompt: values.message,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send message: ${response.statusText} - ${errorText} `);
      }

      toast.style = Toast.Style.Success;
      toast.title = "Message sent";
      onMessageSent();
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to send message";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsLoading(false);
    }
  }

  let lastActivityText = "";
  if (lastActivity) {
    if (lastActivity.userMessaged) {
      lastActivityText = `You: ${lastActivity.userMessaged.userMessage} `;
    } else if (lastActivity.agentMessaged) {
      lastActivityText = `Jules: ${lastActivity.agentMessaged.agentMessage} `;
    } else if (lastActivity.planGenerated) {
      lastActivityText = "Plan Generated";
    } else if (lastActivity.progressUpdated) {
      lastActivityText = `Progress Update: ${lastActivity.progressUpdated.title} `;
    } else if (lastActivity.sessionCompleted) {
      lastActivityText = "Session Completed";
    } else if (lastActivity.sessionFailed) {
      lastActivityText = `Session Failed: ${lastActivity.sessionFailed.reason} `;
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {lastActivityText && <Form.Description title="Last Activity" text={lastActivityText} />}
      <Form.TextArea id="message" title="Message" placeholder="Type your message..." />
    </Form>
  );
}

type SessionActionPanelProps = {
  session: Session;
  revalidate: () => void;
  lastActivity?: Activity;
  copyContent?: string;
};

function SessionActionPanel({ session, revalidate, lastActivity, copyContent }: SessionActionPanelProps) {
  return (
    <ActionPanel>
      <Action.Push
        title="Send Message"
        target={<SendMessageForm session={session} onMessageSent={revalidate} lastActivity={lastActivity} />}
        icon={Icon.Envelope}
      />
      {session.url && <Action.OpenInBrowser url={session.url} />}
      {copyContent && <Action.CopyToClipboard title="Copy Activity Text" content={copyContent} />}
      <Action.CopyToClipboard title="Copy Session ID" content={session.id} />
      <Action title="Refresh" onAction={revalidate} icon={Icon.ArrowClockwise} />
    </ActionPanel>
  );
}

function getActivityDetails(activity: Activity) {
  if (activity.userMessaged) {
    return {
      title: "You",
      markdown: `**You:**\n\n${activity.userMessaged.userMessage}`,
      copyContent: activity.userMessaged.userMessage,
    };
  } else if (activity.agentMessaged) {
    return {
      title: "Jules",
      markdown: `**Jules:**\n\n${activity.agentMessaged.agentMessage}`,
      copyContent: activity.agentMessaged.agentMessage,
    };
  } else if (activity.planGenerated) {
    const planSteps = (activity.planGenerated.plan.steps || []).map((s, i) => `${i + 1}. ${s.title}`).join("\n");
    return {
      title: "Plan Generated",
      markdown: `**Plan Generated:**\n\n${planSteps}`,
      copyContent: planSteps,
    };
  } else if (activity.progressUpdated) {
    return {
      title: "Progress Update",
      markdown: `**Progress Update:**\n\n**${activity.progressUpdated.title}**\n${activity.progressUpdated.description}`,
      copyContent: `${activity.progressUpdated.title}\n${activity.progressUpdated.description}`,
    };
  } else if (activity.sessionCompleted) {
    return {
      title: "Session Completed",
      markdown: "**Session Completed**",
      copyContent: "Session Completed",
    };
  } else if (activity.sessionFailed) {
    return {
      title: "Session Failed",
      markdown: `**Session Failed:**\n\n${activity.sessionFailed.reason}`,
      copyContent: activity.sessionFailed.reason,
    };
  }
  return {
    title: "Unknown Activity",
    markdown: "",
    copyContent: "",
  };
}

function SessionActivities({ session }: { session: Session }) {
  const preferences = getPreferenceValues<Preferences>();
  const { data, isLoading, revalidate } = useFetch<ActivitiesResponse>(
    `${API_BASE_URL}/sessions/${session.id}/activities`,
    {
      headers: {
        "X-Goog-Api-Key": preferences.julesApiKey,
      },
      onError: (error) => {
        showFailureToast(error, {
          title: "Failed to fetch activities",
          message: API_KEY_ERROR_MESSAGE,
        });
      },
    },
  );

  const sortedActivities = useMemo(
    () =>
      [...(data?.activities || [])].sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime()),
    [data?.activities],
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Chat: ${session.title || session.id}`}
      isShowingDetail
      actions={<SessionActionPanel session={session} revalidate={revalidate} lastActivity={sortedActivities[0]} />}
    >
      {sortedActivities.map((activity) => {
        const { title, markdown, copyContent } = getActivityDetails(activity);

        return (
          <List.Item
            key={activity.id}
            title={title}
            detail={<List.Item.Detail markdown={markdown} />}
            actions={
              <SessionActionPanel
                session={session}
                revalidate={revalidate}
                lastActivity={activity}
                copyContent={copyContent}
              />
            }
          />
        );
      })}
    </List>
  );
}

const stateColorMap: Record<string, Color> = {
  succeeded: Color.Green,
  completed: Color.Green,
  failed: Color.Red,
  error: Color.Red,
  in_progress: Color.Blue,
  running: Color.Blue,
  active: Color.Blue,
  awaiting_user_feedback: Color.Orange,
  pending: Color.Yellow,
};

function getStateColor(state: string): Color {
  return stateColorMap[state.toLowerCase()] ?? Color.SecondaryText;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [selectedSource, setSelectedSource] = useState<string>("");

  const { data: sourcesData, isLoading: isLoadingSources } = useSources();

  const { data: sessionsData, isLoading: isLoadingSessions } = useFetch<SessionsResponse>(`${API_BASE_URL}/sessions`, {
    headers: {
      "X-Goog-Api-Key": preferences.julesApiKey,
    },
    onError: (error) => {
      showFailureToast(error, {
        title: "Failed to fetch sessions",
        message: API_KEY_ERROR_MESSAGE,
      });
    },
  });

  useEffect(() => {
    if (sourcesData?.sources && sourcesData.sources.length > 0 && !selectedSource) {
      setSelectedSource(sourcesData.sources[0].name);
    }
  }, [sourcesData]);

  const filteredSessions =
    sessionsData?.sessions?.filter((session) => session.sourceContext?.source === selectedSource) || [];

  return (
    <List
      isLoading={isLoadingSources || isLoadingSessions}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Source" value={selectedSource} onChange={setSelectedSource}>
          {sourcesData?.sources?.map((source) => (
            <List.Dropdown.Item
              key={source.name}
              value={source.name}
              title={`${source.githubRepo.owner}/${source.githubRepo.repo}`}
            />
          ))}
        </List.Dropdown>
      }
    >
      {filteredSessions.map((session) => (
        <List.Item
          key={session.id}
          icon={Icon.Message}
          title={session.title || session.prompt || "Untitled Session"}
          subtitle={session.id}
          accessories={[{ tag: { value: session.state, color: getStateColor(session.state) } }]}
          actions={
            <ActionPanel>
              <Action.Push title="View Activities" icon={Icon.Eye} target={<SessionActivities session={session} />} />
              {session.url && <Action.OpenInBrowser url={session.url} />}
              <Action.CopyToClipboard content={session.id} title="Copy Session ID" />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
