import { useState, useEffect, useRef } from "react";
import {
  List,
  Icon,
  Color,
  ActionPanel,
  Action,
  useNavigation,
  Clipboard,
  showToast,
  Toast,
  confirmAlert,
} from "@raycast/api";
import { format } from "date-fns";
import { ShareSession } from "../types";
import { globalSessions } from "../sessionManager";
import { SessionDetails } from "./SessionDetails";

export function SessionsList() {
  const { pop, push } = useNavigation();
  const [sessions, setSessions] = useState<ShareSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const sessionsRef = useRef<ShareSession[]>([]);

  useEffect(() => {
    const currentSessions = globalSessions.getSessions();
    setSessions(currentSessions);
    sessionsRef.current = currentSessions;
    setIsLoading(false);

    const unsubscribe = globalSessions.subscribe(() => {
      const updatedSessions = globalSessions.getSessions();
      setSessions(updatedSessions);
      sessionsRef.current = updatedSessions;
    });

    return unsubscribe;
  }, []);

  const handleStopSession = async (sessionId: string) => {
    try {
      await globalSessions.stopSession(sessionId);
      await showToast({
        style: Toast.Style.Success,
        title: "File sharing stopped",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error stopping session",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Add a new function to handle stopping all sessions
  const handleStopAllSessions = async () => {
    // First confirm with the user
    const confirmed = await confirmAlert({
      title: "Stop All Sharing Sessions?",
      message: `This will terminate all ${sessions.length} active sharing sessions. This action cannot be undone.`,
      primaryAction: {
        title: "Stop All Sessions",
      },
    });

    if (!confirmed) return;

    try {
      setIsLoading(true);
      await globalSessions.stopAllSessions();
      await showToast({
        style: Toast.Style.Success,
        title: "All sharing sessions stopped",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error stopping sessions",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoading && sessions.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Active Sharing Sessions"
          description="Create a new file sharing session from the main screen"
          icon={Icon.Upload}
          actions={
            <ActionPanel>
              <Action title="Go Back" icon={Icon.ArrowLeft} onAction={pop} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search active sharing sessions..."
      navigationTitle="Manage Sharing Sessions"
      actions={
        <ActionPanel>
          <Action
            title="Stop All Sessions"
            icon={Icon.XmarkCircle}
            style={Action.Style.Destructive}
            onAction={handleStopAllSessions}
            shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
          />
          <Action title="Go Back" icon={Icon.ArrowLeft} onAction={pop} />
        </ActionPanel>
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Keyboard shortcuts"
          storeValue={false}
          onChange={() => {}}
        >
          <List.Dropdown.Item title="⌘D - View details" value="details" />
          <List.Dropdown.Item title="⌘C - Copy ticket" value="copy" />
          <List.Dropdown.Item title="⌘⌫ - Stop sharing" value="stop" />
          <List.Dropdown.Item title="⌘⇧⌫ - Stop all sessions" value="stopall" />
        </List.Dropdown>
      }
    >
      <List.Section
        title="Active Sessions"
        subtitle={`${sessions.length} session${sessions.length !== 1 ? "s" : ""} • ⌘⇧⌫ to stop all`}
      >
        {sessions.map((session) => (
          <List.Item
            key={session.id}
            title={session.fileName}
            subtitle={format(session.startTime, "MMM d, yyyy h:mm a")}
            accessories={[
              {
                text: session.isDetached ? "Recovered" : "Active",
                icon: Icon.CircleFilled,
                tooltip: session.isDetached
                  ? "Recovered session from previous run"
                  : "Sharing active",
              },
              {
                tooltip: "⌘⌫ to stop sharing",
                icon: { source: Icon.Stop, tintColor: Color.Red },
              },
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Status"
                      text={session.isDetached ? "Recovered" : "Active"}
                      icon={{
                        source: Icon.CircleFilled,
                        tintColor: session.isDetached
                          ? Color.Orange
                          : Color.Green,
                      }}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="File"
                      text={session.fileName}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Started"
                      text={format(session.startTime, "MMM d, yyyy h:mm a")}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Ticket"
                      text={session.ticket}
                    />
                    <List.Item.Detail.Metadata.TagList title="Actions">
                      <List.Item.Detail.Metadata.TagList.Item
                        text="⌘D View Details"
                        color={Color.Blue}
                      />
                      <List.Item.Detail.Metadata.TagList.Item
                        text="⌘C Copy Ticket"
                        color={Color.Purple}
                      />
                      <List.Item.Detail.Metadata.TagList.Item
                        text="⌘⌫ Stop Sharing"
                        color={Color.Red}
                      />
                    </List.Item.Detail.Metadata.TagList>
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title="View Details"
                    icon={Icon.Eye}
                    onAction={() =>
                      push(<SessionDetails session={session} onClose={pop} />)
                    }
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                  <Action
                    title="Copy Ticket"
                    icon={Icon.Clipboard}
                    onAction={async () => {
                      await Clipboard.copy(session.ticket);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Ticket Copied",
                      });
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Stop Sharing"
                    icon={Icon.Stop}
                    style={Action.Style.Destructive}
                    onAction={() => handleStopSession(session.id)}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  />
                  <Action
                    title="Stop All Sessions"
                    icon={Icon.XmarkCircle}
                    style={Action.Style.Destructive}
                    onAction={handleStopAllSessions}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                  />
                  <Action
                    title="Go Back"
                    icon={Icon.ArrowLeft}
                    onAction={pop}
                    shortcut={{ modifiers: ["cmd"], key: "b" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
