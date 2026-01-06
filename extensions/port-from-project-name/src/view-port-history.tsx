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
import { showFailureToast, useLocalStorage } from "@raycast/utils";
import { useState } from "react";

type HistoryEntry = {
  port: number;
  createdAt: string;
  updatedAt: string;
  isEdited?: boolean;
};

function EditPortForm({
  projectName,
  currentPort,
  history,
  setHistory,
}: {
  projectName: string;
  currentPort: number;
  history: Record<string, HistoryEntry>;
  setHistory: (value: Record<string, HistoryEntry>) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const [portValue, setPortValue] = useState(String(currentPort));
  const [error, setError] = useState<string | undefined>();

  function validatePort(value: string): string | undefined {
    if (!value || value.trim() === "") {
      return "Port is required";
    }

    const num = parseInt(value, 10);
    if (isNaN(num)) {
      return "Port must be a number";
    }

    if (num < 1000 || num > 9999) {
      return "Must be 1000-9999";
    }

    // Check if port is already used by another project
    for (const [name, entry] of Object.entries(history)) {
      if (name !== projectName && entry.port === num) {
        return `Port ${num} is already in use`;
      }
    }

    return undefined;
  }

  async function handleSubmit(values: { port: string }) {
    const validationError = validatePort(values.port);
    if (validationError) {
      setError(validationError);
      return;
    }

    const newPort = parseInt(values.port, 10);
    const now = new Date().toISOString();
    const existing = history[projectName];

    const next: Record<string, HistoryEntry> = {
      ...history,
      [projectName]: {
        port: newPort,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        isEdited: true,
      },
    };

    await setHistory(next);
    await showToast({
      style: Toast.Style.Success,
      title: "Port Updated",
      message: `${projectName}: ${newPort}`,
    });
    pop();
  }

  return (
    <Form
      navigationTitle={`Edit Port for ${projectName}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Port" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="port"
        title="Port"
        placeholder="Enter port (1000-9999)"
        value={portValue}
        error={error}
        onChange={(value) => {
          setPortValue(value);
          if (error) {
            setError(validatePort(value));
          }
        }}
        onBlur={(event) => {
          setError(validatePort(event.target.value ?? ""));
        }}
      />
      <Form.Description text={`Current port: ${currentPort}`} />
    </Form>
  );
}

export default function Command() {
  const {
    value: history,
    setValue: setHistory,
    isLoading,
  } = useLocalStorage<Record<string, HistoryEntry>>("port-history-v1", {});

  const items = Object.entries(history ?? {})
    .map(([projectName, entry]) => ({ projectName, ...entry }))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  async function handleDelete(projectName: string) {
    const next = { ...(history ?? {}) };
    delete next[projectName];
    await setHistory(next);
    await showToast({ style: Toast.Style.Success, title: "Deleted from history", message: projectName });
  }

  async function handleClearAll() {
    const confirmed = await confirmAlert({
      title: "Clear All History",
      message: "Are you sure you want to clear all port history? This action cannot be undone.",
      primaryAction: {
        title: "Clear",
        style: Alert.ActionStyle.Destructive,
      },
      rememberUserChoice: true,
    });

    if (!confirmed) {
      return;
    }

    await setHistory({});
    await showToast({ style: Toast.Style.Success, title: "Cleared history" });
  }

  if (!isLoading && items.length === 0) {
    return (
      <List
        actions={
          <ActionPanel>
            <Action
              title="Generate Port"
              icon={Icon.Plus}
              onAction={async () => {
                try {
                  await launchCommand({ name: "generate-port", type: LaunchType.UserInitiated });
                } catch (error) {
                  await showFailureToast(error, { title: "Failed to launch command" });
                }
              }}
            />
            <Action
              title="Clear History"
              icon={Icon.XMarkCircle}
              onAction={handleClearAll}
              style={Action.Style.Destructive}
            />
          </ActionPanel>
        }
      >
        <List.EmptyView
          title="No Port History Found"
          description="Generate a port to start building your history."
          icon={Icon.Warning}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Port History" searchBarPlaceholder="Filter by project name">
      {items.map((item) => (
        <List.Item
          key={item.projectName}
          title={item.projectName}
          accessories={[{ tag: { value: String(item.port), color: Color.Blue } }, { date: new Date(item.updatedAt) }]}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Port" content={String(item.port)} />
              <Action.CopyToClipboard title="Copy Project Name" content={item.projectName} />
              <Action.CopyToClipboard title="Copy Project:Port" content={`${item.projectName}:${item.port}`} />
              <Action.Push
                title="Edit Port"
                icon={Icon.Pencil}
                shortcut={Keyboard.Shortcut.Common.Edit}
                target={
                  <EditPortForm
                    projectName={item.projectName}
                    currentPort={item.port}
                    history={history ?? {}}
                    setHistory={setHistory}
                  />
                }
              />
              <ActionPanel.Section>
                <Action
                  title="Delete Entry"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => void handleDelete(item.projectName)}
                />
                <Action
                  title="Clear All History"
                  icon={Icon.XMarkCircle}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  onAction={() => void handleClearAll()}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
