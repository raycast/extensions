import {
  List,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  getRecordingsByUser,
  deleteRecording,
  getCurrentUser,
} from "./utils/storage";
import { TaskRecording } from "./types";

export default function ViewRecordings() {
  const [recordings, setRecordings] = useState<TaskRecording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string>("");

  useEffect(() => {
    loadRecordings();
  }, []);

  async function loadRecordings() {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      const userRecordings = await getRecordingsByUser(user);
      setRecordings(userRecordings.sort((a, b) => b.updatedAt - a.updatedAt));
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load recordings",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteRecording(recordingId: string) {
    try {
      await deleteRecording(recordingId);
      setRecordings(recordings.filter((r) => r.id !== recordingId));
      showToast({
        style: Toast.Style.Success,
        title: "Recording deleted",
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete recording",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // function getActionSummary(recording: TaskRecording): string {
  //   const actionTypes = recording.actions.reduce((acc, action) => {
  //     acc[action.type] = (acc[action.type] || 0) + 1;
  //     return acc;
  //   }, {} as Record<string, number>);
  //
  //   const summary = Object.entries(actionTypes)
  //     .map(([type, count]) => `${count} ${type}`)
  //     .join(", ");
  //
  //   return summary || "No actions recorded";
  // }

  return (
    <List isLoading={isLoading}>
      <List.Section title={`Recordings for ${currentUser}`}>
        {recordings.length === 0 ? (
          <List.Item
            title="No recordings found"
            subtitle="Start recording a task to see it here"
            icon={Icon.Document}
          />
        ) : (
          recordings.map((recording) => (
            <List.Item
              key={recording.id}
              title={recording.name}
              subtitle={recording.description || "No description"}
              accessories={[
                { text: formatDate(recording.createdAt) },
                { text: `${recording.actions.length} actions` },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Details"
                    target={<RecordingDetails recording={recording} />}
                    icon={Icon.Eye}
                  />
                  <Action.Push
                    title="Replay Task"
                    target={<ReplayTask recording={recording} />}
                    icon={Icon.Play}
                  />
                  <Action
                    title="Delete Recording"
                    onAction={() => handleDeleteRecording(recording.id)}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                  />
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>
    </List>
  );
}

function RecordingDetails({ recording }: { recording: TaskRecording }) {
  return (
    <List>
      <List.Section title="Recording Details">
        <List.Item title="Name" subtitle={recording.name} />
        <List.Item
          title="Description"
          subtitle={recording.description || "No description"}
        />
        <List.Item
          title="Created"
          subtitle={new Date(recording.createdAt).toLocaleString()}
        />
        <List.Item
          title="Updated"
          subtitle={new Date(recording.updatedAt).toLocaleString()}
        />
        <List.Item
          title="Actions Count"
          subtitle={recording.actions.length.toString()}
        />
        <List.Item
          title="Tags"
          subtitle={recording.tags.join(", ") || "No tags"}
        />
      </List.Section>
      <List.Section title="Actions">
        {recording.actions.map((action, index) => (
          <List.Item
            key={action.id}
            title={`${index + 1}. ${action.type.toUpperCase()}`}
            subtitle={getActionDescription(action)}
            accessories={[
              { text: new Date(action.timestamp).toLocaleTimeString() },
            ]}
          />
        ))}
      </List.Section>
    </List>
  );
}

function getActionDescription(action: any): string {
  switch (action.type) {
    case "browser":
      return `${action.data.action}: ${action.data.url}`;
    case "terminal":
      return `Command: ${action.data.command}`;
    case "application":
      return `${action.data.action}: ${action.data.app}`;
    case "file":
      return `${action.data.action}: ${action.data.path}`;
    default:
      return "Unknown action";
  }
}

function ReplayTask({ recording }: { recording: TaskRecording }) {
  return (
    <List>
      <List.Item
        title="Replay functionality coming soon"
        subtitle={`This will replay the ${recording.actions.length} actions from "${recording.name}"`}
      />
    </List>
  );
}
