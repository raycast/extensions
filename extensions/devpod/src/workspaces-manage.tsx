import {
  Icon,
  List,
  ActionPanel,
  Action,
  Detail,
  Color,
  Keyboard,
  showToast,
  Image,
  useNavigation,
  getPreferenceValues,
} from "@raycast/api";
import { DevPodWorkspace, DevPodWorkspaceCommand, DevPodWorkspaceState, DevPodWorkspaceStatus } from "./devpod";
import React from "react";
import { debugEnabled, formatRelativeDate } from "./util";
import { useExec } from "@raycast/utils";
import WorkspaceCreate from "./workspace-create";

interface Preferences {
  devPodPath: string;
}

export default function WorkspaceMenu() {
  const { devPodPath } = getPreferenceValues<Preferences>();
  const { push } = useNavigation();
  const { isLoading, data, error, revalidate } = useExec(devPodPath, DevPodWorkspaceCommand.listAsJson, {
    onData: (data) => {
      if (debugEnabled) {
        console.log("WorkspaceMenu.useExec.onData() - Workspaces reloaded ", data);
      }
    },
    onError: (err) => {
      if (debugEnabled) {
        console.error("WorkspaceMenu.useExec.onData() - Error while reloading workspaces", err);
      }
    },
  });

  const workspaces: DevPodWorkspace[] = React.useMemo(() => JSON.parse(data ?? "[]"), [data]);
  const reloadWorkspaces = React.useCallback(() => revalidate(), [revalidate]);

  return error ? (
    <Detail markdown={`${error}`} />
  ) : (
    <List
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            key="Create"
            title="Create New Workspace"
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={() => {
              push(<WorkspaceCreate />);
            }}
          />
          <Action
            key="Reload UI"
            title="Reload List"
            shortcut={reloadShortcut}
            onAction={() => {
              reloadWorkspaces();
              showToast({ title: "Reloading..." });
            }}
          />
        </ActionPanel>
      }
    >
      {workspaces &&
        workspaces.map((workspace) => (
          <WorkspaceItem
            key={workspace.id}
            reloadWorkspaces={reloadWorkspaces}
            workspace={workspace}
            devPodPath={devPodPath}
          />
        ))}
    </List>
  );
}

const WorkspaceItem = function WorkspaceItem({
  workspace,
  reloadWorkspaces,
  devPodPath,
}: {
  workspace: DevPodWorkspace;
  reloadWorkspaces: () => void;
  devPodPath: string;
}) {
  if (debugEnabled) {
    console.log(`WorkspaceItem() - id:${workspace.id}, ide:${workspace.ide.name}`);
  }

  const [lifecycleCommand, setLifecycleCommand] = React.useState([] as string[]);
  const [execute, setExecute] = React.useState(false);
  const { push } = useNavigation();

  useExec(devPodPath, lifecycleCommand, {
    execute,
    onData: () => {
      if (debugEnabled) {
        console.log("WorkspaceItem.useExec.onData()", lifecycleCommand);
      }
      setExecute(false);
      setLifecycleCommand([]);
      // This is necessary since it takes time for the status to be updated.
      setTimeout(() => {
        revalidate();
      }, 2000);
    },
    onError: () => {
      if (debugEnabled) {
        console.log("WorkspaceItem.useExec.onError()", lifecycleCommand);
      }
      setExecute(false);
      setLifecycleCommand([]);
    },
  });

  const { data, error, isLoading, revalidate } = useExec(devPodPath, DevPodWorkspaceCommand.statusAsJson(workspace.id));

  if (error) {
    return (
      <List.Item
        title={workspace.id}
        subtitle={"Error fetching status. Start to establish link."}
        actions={
          <ActionPanel>
            <Action
              key="Start"
              title="Start"
              shortcut={startShortcut}
              onAction={() => {
                setLifecycleCommand(DevPodWorkspaceCommand.up(workspace.id));
                setExecute(true);
                showToast({ title: "Starting...", message: "Please wait. This can up to a few minutes." });
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading) {
    return <List.Item title={workspace.id} subtitle={"Fetching status"} />;
  }

  if (data) {
    if (debugEnabled) {
      console.log(data);
    }
    const status: DevPodWorkspaceStatus = JSON.parse(data);
    return (
      <List.Item
        key={workspace.id}
        icon={statusIcon(status.state)}
        title={workspace.id}
        subtitle={"Status: " + status.state}
        accessories={[{ text: `Provider: ${status.provider}` }]}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title={status.provider} />
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <WorkspaceActions
            workspace={workspace}
            status={status}
            setLifecycleCommand={setLifecycleCommand}
            setExecute={setExecute}
            reloadWorkspaces={reloadWorkspaces}
            push={push}
            devPodPath={devPodPath}
          />
        }
      />
    );
  }

  return <List.Item title={workspace.id} subtitle={"No data found for workspace"} />;
};

interface WorkspaceDetailProps {
  workspace: DevPodWorkspace;
  status: DevPodWorkspaceStatus;
  devPodPath: string;
}

function createWorkspaceMarkdown(workspace: DevPodWorkspace, status: DevPodWorkspaceStatus) {
  const lastUsed = formatRelativeDate(workspace.lastUsed);
  const created = formatRelativeDate(workspace.creationTimestamp);
  const markdown = `
### ${workspace.id}
| State | Provider | Last Used | Created |
| ----- | -------- | --------- | ------- |
| ${status.state} | ${workspace.provider.name} | ${lastUsed} | ${created} |

---
Workspace Raw Data:
\`\`\`json
${JSON.stringify(workspace, null, 2)}
\`\`\`
Status Raw Data:
\`\`\`json
status:
${JSON.stringify(status, null, 2)}
\`\`\`
`;
  return markdown;
}

function WorkspaceDetail({ workspace, status, devPodPath }: WorkspaceDetailProps) {
  let markdown = createWorkspaceMarkdown(workspace, status);

  const { data, error, isLoading, revalidate } = useExec(devPodPath, DevPodWorkspaceCommand.logs(workspace.id), {
    execute: true,
  });

  if (data) {
    markdown += `
Logs:
\`\`\`bash
${data}
\`\`\`
`;
  }

  if (error) {
    markdown = `
### ${workspace.id}
There was an error while fetching logs:
${error}
`;
  }

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            key="Reload Details"
            title="Reload Details"
            shortcut={reloadShortcut}
            onAction={() => {
              revalidate();
              showToast({ title: "Reloading..." });
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function statusIcon(state: DevPodWorkspaceState): Image.ImageLike {
  let icon: Image.ImageLike | undefined;

  switch (state) {
    case DevPodWorkspaceState.Running:
      icon = { source: Icon.Bolt, tintColor: Color.Green };
      break;
    case DevPodWorkspaceState.Stopped:
      icon = { source: Icon.Stop, tintColor: Color.Red };
      break;
    default:
      icon = { source: Icon.QuestionMark, tintColor: Color.Purple };
  }
  return icon;
}

const stopShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "s" };
const startShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "s" };
const reloadShortcut: Keyboard.Shortcut = { modifiers: ["cmd"], key: "r" };
const deleteShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "d" };

interface WorkspaceActionsProps {
  workspace: DevPodWorkspace;
  status: DevPodWorkspaceStatus;
  setLifecycleCommand: (command: string[]) => void;
  setExecute: (execute: boolean) => void;
  reloadWorkspaces: () => void;
  push: (component: JSX.Element) => void;
  devPodPath: string;
}

function WorkspaceActions({
  workspace,
  status,
  setLifecycleCommand,
  setExecute,
  reloadWorkspaces,
  push,
  devPodPath,
}: WorkspaceActionsProps) {
  return (
    <ActionPanel>
      <Action
        key="Detail"
        title="View Details"
        onAction={() => push(<WorkspaceDetail workspace={workspace} status={status} devPodPath={devPodPath} />)}
      />
      {status.state == DevPodWorkspaceState.Stopped && (
        <Action
          key="Start"
          title="Start"
          shortcut={startShortcut}
          onAction={() => {
            setLifecycleCommand(DevPodWorkspaceCommand.up(workspace.id));
            setExecute(true);
            setTimeout(() => {
              reloadWorkspaces();
            }, 3000);
            showToast({ title: "Starting...", message: "Please wait. This can take up to a few minutes" });
          }}
        />
      )}
      {status.state == DevPodWorkspaceState.Running && (
        <Action
          key="Stop"
          title="Stop"
          shortcut={stopShortcut}
          onAction={() => {
            setLifecycleCommand(DevPodWorkspaceCommand.stop(workspace.id));
            setExecute(true);
            setTimeout(() => {
              reloadWorkspaces();
            }, 3000);
            showToast({ title: "Stopping..." });
          }}
        />
      )}
      <Action
        key="Delete"
        title="Delete"
        shortcut={deleteShortcut}
        onAction={() => {
          setLifecycleCommand(DevPodWorkspaceCommand.delete(workspace.id));
          setTimeout(() => {
            reloadWorkspaces();
          }, 3000);
          setExecute(true);
          showToast({ title: "Deleting...", message: "Please wait. This can take a few moments" });
        }}
      />
      <Action
        key="Create"
        title="Create New Workspace"
        shortcut={{ modifiers: ["cmd"], key: "c" }}
        onAction={() => {
          push(<WorkspaceCreate />);
        }}
      />
      <Action
        key="Reload UI"
        title="Reload List"
        shortcut={reloadShortcut}
        onAction={() => {
          reloadWorkspaces();
          showToast({ title: "Reloading..." });
        }}
      />
    </ActionPanel>
  );
}
