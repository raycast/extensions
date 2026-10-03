import {
  Action,
  ActionPanel,
  launchCommand,
  LaunchType,
  List,
  LocalStorage,
  showToast,
  Toast,
  type LaunchProps,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { CAPTURE_WORKSPACE_KEY } from "./capture.js";
import type { BrowserTab } from "./browser.js";
import { listLearnWorkspaces } from "./learn-cli.js";
import { getLearnExecutable } from "./preferences.js";

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
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function WorkspaceSelection({ executable }: { executable: string }) {
  const {
    data: workspaces,
    isLoading,
    error,
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

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Choose a Learn workspace">
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
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
