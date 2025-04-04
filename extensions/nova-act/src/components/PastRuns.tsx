import {
  Action,
  ActionPanel,
  List,
  LocalStorage,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  useNavigation,
  Icon,
} from "@raycast/api";
import { useEffect, useState } from "react";
import Setup from "./RunSetup";
import RunDetails from "./RunDetails";
import path from "path";
import fs from "fs";

export interface ActRun {
  id: string;
  date: string;
  prompt: string;
  logs: string;
}

export default function PastRuns() {
  const [runs, setRuns] = useState<ActRun[]>([]);
  const { push } = useNavigation();

  async function loadRuns() {
    const stored = await LocalStorage.getItem<string>("pastRuns");
    if (!stored) {
      setRuns([]);
      return;
    }
    try {
      const arr: ActRun[] = JSON.parse(stored);
      setRuns(arr);
    } catch {
      setRuns([]);
    }
  }

  useEffect(() => {
    loadRuns();
  }, []);

  async function handleClearAllRuns() {
    const userConfirmed = await confirmAlert({
      title: "Clear All Past Runs?",
      message: "This will remove all logs and cannot be undone.",
      primaryAction: {
        title: "Clear",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!userConfirmed) return;
    // Remove only the "pastRuns" key
    await LocalStorage.removeItem("pastRuns");
    setRuns([]);
    await showToast({ style: Toast.Style.Success, title: "Cleared All Runs" });

    const logsDirectory = path.resolve(__dirname, "logs");
    try {
      // Remove all files in the logs directory
      fs.rm(logsDirectory, { recursive: true }, () => {});
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Error Removing Logs From Directory", message: `${error}` });
    }
  }

  return (
    <List>
      {/* Global actions section */}
      <List.Section title="Actions">
        <List.Item
          title="Start New Run"
          icon={Icon.Play}
          actions={
            <ActionPanel>
              <Action title="Start New Run" onAction={() => push(<Setup />)} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Clear All Runs"
          icon={Icon.Trash}
          actions={
            <ActionPanel>
              <Action title="Clear All Runs" style={Action.Style.Destructive} onAction={handleClearAllRuns} />
            </ActionPanel>
          }
        />
      </List.Section>

      {/* Past Runs list */}
      <List.Section title="Past Runs">
        {runs.length === 0 && (
          <List.Item
            title="No past runs available."
            actions={
              <ActionPanel>
                <Action title="Reload" onAction={loadRuns} />
              </ActionPanel>
            }
          />
        )}
        {runs
          .sort((a, b) => +new Date(b.date) - +new Date(a.date))
          .map((run) => (
            <List.Item
              key={run.id}
              title={run.prompt}
              subtitle={new Date(run.date).toLocaleString()}
              actions={
                <ActionPanel>
                  <Action title="View Run Details" onAction={() => push(<RunDetails logs={run.logs} />)} />
                  <Action title="Reload Runs" onAction={loadRuns} />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
