import {
  List,
  ActionPanel,
  Action,
  Form,
  Icon,
  Color,
  showToast,
  Toast,
  useNavigation,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getWorkspaces,
  addWorkspace,
  removeWorkspace,
  getActiveWorkspaceId,
  setActiveWorkspaceId,
  migrateGlobalApiKey,
} from "./lib/workspaces";
import type { WorkspaceProfile } from "./lib/types";

export default function ManageWorkspacesCommand() {
  const [workspaces, setWorkspaces] = useState<WorkspaceProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  async function refresh() {
    // Auto-import global API key if no workspace profiles exist yet
    await migrateGlobalApiKey();
    const ws = await getWorkspaces();
    const active = await getActiveWorkspaceId();
    setWorkspaces(ws);
    setActiveId(active);
    setIsLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  function getWorkspaceIcon(ws: WorkspaceProfile, isActive: boolean) {
    if (ws.icon) {
      return ws.icon;
    }
    return isActive
      ? { source: Icon.CheckCircle, tintColor: Color.Green }
      : Icon.Building;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search workspaces...">
      {workspaces.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No workspaces configured"
          description="Add a workspace with its API key to get started"
          icon={Icon.Building}
          actions={
            <ActionPanel>
              <Action
                title="Add Workspace"
                icon={Icon.Plus}
                onAction={() => push(<AddWorkspaceForm onDone={refresh} />)}
              />
            </ActionPanel>
          }
        />
      ) : (
        workspaces.map((ws) => {
          const isActive = ws.id === activeId;
          return (
            <List.Item
              key={ws.id}
              title={(ws.icon ? ws.icon + "  " : "") + ws.name}
              subtitle={ws.apiKey.slice(0, 15) + "..."}
              icon={getWorkspaceIcon(ws, isActive)}
              accessories={[
                ...(ws.baseUrl ? [{ text: ws.baseUrl, icon: Icon.Globe }] : []),
                ...(isActive
                  ? [{ tag: { value: "Active", color: Color.Green } }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  {!isActive && (
                    <Action
                      title="Set as Active"
                      icon={Icon.CheckCircle}
                      onAction={async () => {
                        await setActiveWorkspaceId(ws.id);
                        await showToast({
                          style: Toast.Style.Success,
                          title: `Switched to ${ws.name}`,
                        });
                        refresh();
                      }}
                    />
                  )}
                  <Action
                    title="Edit Workspace"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    onAction={() =>
                      push(
                        <EditWorkspaceForm workspace={ws} onDone={refresh} />,
                      )
                    }
                  />
                  <Action
                    title="Add Workspace"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => push(<AddWorkspaceForm onDone={refresh} />)}
                  />
                  <Action
                    title="Delete Workspace"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Delete Workspace",
                          message: `Remove "${ws.name}" from Raycast? This won't affect your OmniSocials account.`,
                          primaryAction: {
                            title: "Delete",
                            style: Alert.ActionStyle.Destructive,
                          },
                        })
                      ) {
                        await removeWorkspace(ws.id);
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Workspace removed",
                        });
                        refresh();
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}

function AddWorkspaceForm({ onDone }: { onDone: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: {
    icon: string;
    name: string;
    apiKey: string;
    baseUrl: string;
  }) {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }
    if (!values.apiKey.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API key is required",
      });
      return;
    }

    const workspace: WorkspaceProfile = {
      id: Date.now().toString(),
      name: values.name.trim(),
      apiKey: values.apiKey.trim(),
      icon: values.icon.trim() || undefined,
      baseUrl: values.baseUrl.trim() || undefined,
    };

    await addWorkspace(workspace);
    await showToast({
      style: Toast.Style.Success,
      title: `Added "${workspace.name}"`,
    });
    onDone();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Workspace"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Workspace Name"
        placeholder="e.g. My Brand, Client X"
        autoFocus
      />
      <Form.TextField
        id="icon"
        title="Icon (Optional)"
        placeholder="e.g. 🚀, 🏢, 🎯"
        info="Add an emoji to identify this workspace quickly"
      />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        placeholder="omsk_live_..."
      />
      <Form.TextField
        id="baseUrl"
        title="API Base URL (Optional)"
        placeholder="https://app.omnisocials.com"
        info="Only change this if you're self-hosting OmniSocials. Leave empty otherwise."
      />
    </Form>
  );
}

function EditWorkspaceForm({
  workspace,
  onDone,
}: {
  workspace: WorkspaceProfile;
  onDone: () => void;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: {
    icon: string;
    name: string;
    apiKey: string;
    baseUrl: string;
  }) {
    if (!values.name.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name is required",
      });
      return;
    }
    if (!values.apiKey.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API key is required",
      });
      return;
    }

    const { updateWorkspace } = await import("./lib/workspaces");
    await updateWorkspace({
      id: workspace.id,
      name: values.name.trim(),
      apiKey: values.apiKey.trim(),
      icon: values.icon.trim() || undefined,
      baseUrl: values.baseUrl.trim() || undefined,
    });

    await showToast({
      style: Toast.Style.Success,
      title: `Updated "${values.name.trim()}"`,
    });
    onDone();
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Workspace Name"
        defaultValue={workspace.name}
        autoFocus
      />
      <Form.TextField
        id="icon"
        title="Icon (Optional)"
        defaultValue={workspace.icon || ""}
        placeholder="e.g. 🚀, 🏢, 🎯"
        info="Add an emoji to identify this workspace quickly"
      />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        defaultValue={workspace.apiKey}
      />
      <Form.TextField
        id="baseUrl"
        title="API Base URL (Optional)"
        defaultValue={workspace.baseUrl || ""}
        placeholder="https://app.omnisocials.com"
      />
    </Form>
  );
}
