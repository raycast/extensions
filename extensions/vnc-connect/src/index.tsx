import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  LocalStorage,
  useNavigation,
  Form,
  confirmAlert,
  Alert,
  Color,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import plist from "plist";

interface VncLocation {
  id: string;
  name: string;
  host: string;
  port?: number;
  username?: string;
  password?: string;
  source: "system" | "custom";
}

interface VncLocPlist {
  URL?: string;
  restorationAttributes?: {
    targetAddress?: string;
  };
}

const STORAGE_KEY = "vnc-connections";

const SCREEN_SHARING_PATH = join(
  homedir(),
  "Library/Containers/com.apple.ScreenSharing/Data/Library/Application Support/Screen Sharing",
);

function buildVncUrl(location: VncLocation): string {
  let url = "vnc://";

  // Add credentials if available
  if (location.username || location.password) {
    if (location.username) {
      url += encodeURIComponent(location.username);
    }
    if (location.password) {
      url += `:${encodeURIComponent(location.password)}`;
    }
    url += "@";
  }

  url += location.host;

  if (location.port && location.port !== 5900) {
    url += `:${location.port}`;
  }
  return url;
}

function parseVncLoc(filePath: string): VncLocation | null {
  try {
    const content = readFileSync(filePath, "utf-8");
    const parsed = plist.parse(content) as VncLocPlist;

    const url = parsed.URL || parsed.restorationAttributes?.targetAddress;
    if (!url) return null;

    const match = url.match(/vnc:\/\/([^/?:]+)(?::(\d+))?/);
    const host = match ? match[1] : url.replace("vnc://", "");
    const port = match?.[2] ? parseInt(match[2]) : undefined;

    const name = filePath.split("/").pop()?.replace(".vncloc", "") || host;

    return {
      id: `system-${host}`,
      name,
      host,
      port,
      source: "system",
    };
  } catch {
    return null;
  }
}

function loadSystemLocations(): VncLocation[] {
  try {
    const files = readdirSync(SCREEN_SHARING_PATH);
    const locations: VncLocation[] = [];

    for (const file of files) {
      if (file.endsWith(".vncloc")) {
        const location = parseVncLoc(join(SCREEN_SHARING_PATH, file));
        if (location) {
          locations.push(location);
        }
      }
    }

    return locations;
  } catch {
    return [];
  }
}

async function loadCustomLocations(): Promise<VncLocation[]> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

async function saveCustomLocations(locations: VncLocation[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
}

function AddConnectionForm({
  onAdd,
}: {
  onAdd: (location: VncLocation) => void;
}) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [hostError, setHostError] = useState<string | undefined>();

  async function handleSubmit(values: {
    name: string;
    host: string;
    port: string;
    username: string;
    password: string;
  }) {
    if (!values.name.trim()) {
      setNameError("Name is required");
      return;
    }
    if (!values.host.trim()) {
      setHostError("Host is required");
      return;
    }

    const location: VncLocation = {
      id: `custom-${Date.now()}`,
      name: values.name.trim(),
      host: values.host.trim(),
      port: values.port ? parseInt(values.port) : undefined,
      username: values.username.trim() || undefined,
      password: values.password || undefined,
      source: "custom",
    };

    onAdd(location);
    showToast({ style: Toast.Style.Success, title: "Connection added" });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Connection"
            onSubmit={handleSubmit}
            icon={Icon.Plus}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My Server"
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="host"
        title="Host"
        placeholder="192.168.1.100 or server.example.com"
        error={hostError}
        onChange={() => setHostError(undefined)}
      />
      <Form.TextField id="port" title="Port" placeholder="5900 (default)" />
      <Form.Separator />
      <Form.TextField id="username" title="Username" placeholder="(optional)" />
      <Form.PasswordField
        id="password"
        title="Password"
        placeholder="(optional)"
      />
    </Form>
  );
}

function EditConnectionForm({
  location,
  onSave,
}: {
  location: VncLocation;
  onSave: (location: VncLocation) => void;
}) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [hostError, setHostError] = useState<string | undefined>();

  async function handleSubmit(values: {
    name: string;
    host: string;
    port: string;
    username: string;
    password: string;
  }) {
    if (!values.name.trim()) {
      setNameError("Name is required");
      return;
    }
    if (!values.host.trim()) {
      setHostError("Host is required");
      return;
    }

    const updated: VncLocation = {
      ...location,
      name: values.name.trim(),
      host: values.host.trim(),
      port: values.port ? parseInt(values.port) : undefined,
      username: values.username.trim() || undefined,
      password: values.password || undefined,
    };

    onSave(updated);
    showToast({ style: Toast.Style.Success, title: "Connection updated" });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            onSubmit={handleSubmit}
            icon={Icon.Check}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={location.name}
        error={nameError}
        onChange={() => setNameError(undefined)}
      />
      <Form.TextField
        id="host"
        title="Host"
        defaultValue={location.host}
        error={hostError}
        onChange={() => setHostError(undefined)}
      />
      <Form.TextField
        id="port"
        title="Port"
        defaultValue={location.port?.toString() || ""}
        placeholder="5900"
      />
      <Form.Separator />
      <Form.TextField
        id="username"
        title="Username"
        defaultValue={location.username || ""}
        placeholder="(optional)"
      />
      <Form.PasswordField
        id="password"
        title="Password"
        defaultValue={location.password || ""}
        placeholder="(optional)"
      />
    </Form>
  );
}

export default function Command() {
  const [locations, setLocations] = useState<VncLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const loadAllLocations = useCallback(async () => {
    const system = loadSystemLocations();
    const custom = await loadCustomLocations();
    const all = [...custom, ...system].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    setLocations(all);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadAllLocations();
  }, [loadAllLocations]);

  const handleAdd = useCallback(
    async (location: VncLocation) => {
      const custom = await loadCustomLocations();
      custom.push(location);
      await saveCustomLocations(custom);
      loadAllLocations();
    },
    [loadAllLocations],
  );

  const handleEdit = useCallback(
    async (updated: VncLocation) => {
      const custom = await loadCustomLocations();
      const index = custom.findIndex((l) => l.id === updated.id);
      if (index !== -1) {
        custom[index] = updated;
        await saveCustomLocations(custom);
        loadAllLocations();
      }
    },
    [loadAllLocations],
  );

  const handleDelete = useCallback(
    async (location: VncLocation) => {
      const confirmed = await confirmAlert({
        title: "Delete Connection",
        message: `Are you sure you want to delete "${location.name}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (confirmed) {
        const custom = await loadCustomLocations();
        const filtered = custom.filter((l) => l.id !== location.id);
        await saveCustomLocations(filtered);
        showToast({ style: Toast.Style.Success, title: "Connection deleted" });
        loadAllLocations();
      }
    },
    [loadAllLocations],
  );

  const customLocations = locations.filter((l) => l.source === "custom");
  const systemLocations = locations.filter((l) => l.source === "system");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search VNC connections..."
      actions={
        <ActionPanel>
          <Action
            title="Add Connection"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => push(<AddConnectionForm onAdd={handleAdd} />)}
          />
        </ActionPanel>
      }
    >
      {customLocations.length > 0 && (
        <List.Section title="Custom Connections">
          {customLocations.map((location) => (
            <List.Item
              key={location.id}
              icon={{ source: Icon.Monitor, tintColor: Color.Blue }}
              title={location.name}
              subtitle={
                location.port
                  ? `${location.host}:${location.port}`
                  : location.host
              }
              accessories={[{ tag: { value: "Custom", color: Color.Blue } }]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Open
                      title="Connect"
                      target={buildVncUrl(location)}
                      icon={Icon.Link}
                    />
                    <Action.CopyToClipboard
                      title="Copy Address"
                      content={location.host}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Edit Connection"
                      icon={Icon.Pencil}
                      shortcut={{ modifiers: ["cmd"], key: "e" }}
                      onAction={() =>
                        push(
                          <EditConnectionForm
                            location={location}
                            onSave={handleEdit}
                          />,
                        )
                      }
                    />
                    <Action
                      title="Delete Connection"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                      onAction={() => handleDelete(location)}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Add Connection"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={() =>
                        push(<AddConnectionForm onAdd={handleAdd} />)
                      }
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {systemLocations.length > 0 && (
        <List.Section title="Screen Sharing">
          {systemLocations.map((location) => (
            <List.Item
              key={location.id}
              icon={{ source: Icon.Monitor, tintColor: Color.SecondaryText }}
              title={location.name}
              subtitle={
                location.port
                  ? `${location.host}:${location.port}`
                  : location.host
              }
              accessories={[
                { tag: { value: "System", color: Color.SecondaryText } },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Open
                      title="Connect"
                      target={buildVncUrl(location)}
                      icon={Icon.Link}
                    />
                    <Action.CopyToClipboard
                      title="Copy Address"
                      content={location.host}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      title="Add Connection"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "n" }}
                      onAction={() =>
                        push(<AddConnectionForm onAdd={handleAdd} />)
                      }
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {locations.length === 0 && !isLoading && (
        <List.EmptyView
          title="No VNC Connections"
          description="Add a connection or use Screen Sharing app to save one"
          actions={
            <ActionPanel>
              <Action
                title="Add Connection"
                icon={Icon.Plus}
                onAction={() => push(<AddConnectionForm onAdd={handleAdd} />)}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
