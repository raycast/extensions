import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
  LocalStorage,
  showToast,
  Toast,
  useNavigation,
  type LaunchProps,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { CAPTURE_WORKSPACE_KEY } from "./capture.js";
import type { BrowserTab } from "./browser.js";
import { listLearnWorkspaces } from "./learn-cli.js";
import { getLearnExecutable } from "./preferences.js";
import { CreateWorkspaceForm } from "./create-workspace.js";

interface CaptureContext {
  tabs: BrowserTab[];
  workspaces: string[];
  savedWorkspace?: string;
}

type WorkspaceLaunchProps = LaunchProps<{
  launchContext?: { capture?: CaptureContext };
}>;

export default function ChooseWorkspace({
  launchContext,
}: WorkspaceLaunchProps) {
  if (launchContext?.capture) {
    return <CaptureSelection context={launchContext.capture} />;
  }
  return <WorkspaceSelection executable={getLearnExecutable()} />;
}

function CaptureSelection({ context }: { context: CaptureContext }) {
  const [selectedTab, setSelectedTab] = useState<BrowserTab | undefined>(
    context.tabs.length === 1 ? context.tabs[0] : undefined,
  );
  const launching = useRef(false);
  const { push } = useNavigation();

  async function save(
    tab: BrowserTab,
    workspace: string,
    rememberWorkspace = false,
  ) {
    if (launching.current) return;
    launching.current = true;
    try {
      if (rememberWorkspace) {
        await LocalStorage.setItem(CAPTURE_WORKSPACE_KEY, workspace);
      }
      await launchCommand({
        name: "save-current-browser-url",
        type: LaunchType.UserInitiated,
        context: { capture: { url: tab.url, title: tab.title, workspace } },
      });
    } catch (error) {
      launching.current = false;
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save browser URL",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (!selectedTab) {
    return (
      <List searchBarPlaceholder="Choose the browser window to save">
        {context.tabs.map((tab) => (
          <List.Item
            key={tab.id}
            title={tab.title || tab.url}
            subtitle={tab.url}
            actions={
              <ActionPanel>
                <Action
                  title="Save This Tab"
                  onAction={() => {
                    if (context.savedWorkspace) {
                      return save(tab, context.savedWorkspace);
                    }
                    setSelectedTab(tab);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Choose a Learn workspace">
      <List.EmptyView
        title="Create your first Learn workspace"
        description="Choose a name, then save this browser tab to it."
        actions={
          <ActionPanel>
            <Action
              title="Create Workspace and Save Tab"
              icon={Icon.Plus}
              onAction={() =>
                push(
                  <CreateWorkspaceForm
                    executable={getLearnExecutable()}
                    onCreated={(workspace) => save(selectedTab, workspace)}
                  />,
                )
              }
            />
          </ActionPanel>
        }
      />
      {context.workspaces.map((workspace) => (
        <List.Item
          key={workspace}
          title={workspace}
          subtitle={selectedTab.title || selectedTab.url}
          actions={
            <ActionPanel>
              <Action
                title="Save to Workspace"
                onAction={() => save(selectedTab, workspace, true)}
              />
              <Action
                title="Create Workspace and Save Tab"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={() =>
                  push(
                    <CreateWorkspaceForm
                      executable={getLearnExecutable()}
                      onCreated={(name) => save(selectedTab, name)}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function WorkspaceSelection({ executable }: { executable: string }) {
  const { push, pop } = useNavigation();
  const {
    data: workspaces,
    isLoading,
    error,
    revalidate,
  } = usePromise(listLearnWorkspaces, [executable], {
    onError: () => undefined,
    failureToastOptions: { title: "Could not list Learn workspaces" },
  });

  useEffect(() => {
    if (!error) return;
    void showToast({
      style: Toast.Style.Failure,
      title: "Could not list Learn workspaces",
      message: error.message,
    });
  }, [error]);

  function createWorkspace() {
    push(
      <CreateWorkspaceForm
        executable={executable}
        onCreated={async () => {
          await revalidate();
          pop();
        }}
      />,
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Choose a Learn workspace">
      <List.EmptyView
        title={
          error
            ? "Could not load workspaces"
            : "Create your first Learn workspace"
        }
        description={
          error
            ? error.message
            : "Create a workspace to start collecting learning resources."
        }
        actions={
          <ActionPanel>
            {error ? (
              <Action title="Reload Workspaces" onAction={revalidate} />
            ) : (
              <Action
                title="Create Workspace"
                icon={Icon.Plus}
                onAction={createWorkspace}
              />
            )}
          </ActionPanel>
        }
      />
      {(workspaces || []).map((workspace) => (
        <List.Item
          key={workspace}
          title={workspace}
          actions={
            <ActionPanel>
              <Action
                title="Use Workspace"
                onAction={async () => {
                  await LocalStorage.setItem(CAPTURE_WORKSPACE_KEY, workspace);
                  await showToast({
                    style: Toast.Style.Success,
                    title: `Using ${workspace}`,
                  });
                }}
              />
              <Action
                title="Create Workspace"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                onAction={createWorkspace}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
