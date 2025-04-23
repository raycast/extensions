import { Action, ActionPanel, closeMainWindow, Icon, List, PopToRootType, showToast, Toast } from "@raycast/api";
import { runAppleScript, useExec } from "@raycast/utils";
import { useMemo } from "react";
import { execSync } from "child_process";
import { CLIOutput, WorkflowItem } from "./types.d";

let appPath: string | undefined;
try {
  appPath = execSync(`/usr/bin/mdfind "kMDItemCFBundleIdentifier == 'co.zottmann.BarCuts'"`, {
    encoding: "utf8",
  }).trim();

  if (!appPath) {
    console.warn("BarCuts CLI not found via mdfind.");
    appPath = undefined;
  }
} catch (error) {
  console.error("Error finding BarCuts CLI:", error);
  appPath = undefined;
}

export default function Command() {
  if (!appPath) {
    showToast({
      style: Toast.Style.Failure,
      title: "Could not find BarCuts in /Applications, exiting!",
    });

    return (
      <List searchBarPlaceholder="BarCuts not found …">
        <List.EmptyView title="BarCuts Is Not Installed" icon={Icon.Warning} />
      </List>
    );
  }

  // Fetch data from BarCuts
  const { isLoading, data } = useExec(`${appPath}/Contents/MacOS/barcuts-cli`);

  // Parse BarCuts data
  const workflows = useMemo<WorkflowItem[]>(() => {
    try {
      const cliOutput: CLIOutput = JSON.parse(data || "{}") || {};
      return [
        ...cliOutput.activeWorkflows,
        ...(cliOutput.globalWorkflows || []).map((wf) => ({
          ...wf,
          isGlobal: true,
        })),
      ];
    } catch (e) {
      console.error("Failed to parse BarCuts CLI output:", e);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load workflow list",
        message: "Could not parse data from BarCuts CLI.",
      });
      return [];
    }
  }, [data]);

  if (isLoading) {
    return <List isLoading={true} searchBarPlaceholder="Loading workflows…" />;
  }

  // If there are no workflows to display, say so
  if (!workflows.length) {
    return (
      <List searchBarPlaceholder="Search workflows…">
        <List.EmptyView title="No Workflows Found" description="Could not find any active workflows." />
      </List>
    );
  }

  // Display active & global workflows
  return (
    <List searchBarPlaceholder="Search workflows…">
      {workflows.map((wf) => (
        <List.Item
          key={wf.workflowID}
          title={wf.fullTitle}
          subtitle={wf.isGlobal ? "Global workflow" : undefined}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Play}
                title="Run Workflow"
                onAction={() => {
                  runAppleScript(`
                    tell application "Shortcuts Events"
                      ignoring application responses
                        run shortcut id "${wf.workflowID}"
                      end ignoring
                    end tell
                  `);
                  closeMainWindow({ popToRootType: PopToRootType.Immediate });
                }}
              />
              <Action.OpenInBrowser
                icon={Icon.Pencil}
                title="Open in Shortcuts Editor"
                url={`shortcuts://open-shortcut?id=${wf.workflowID}`}
                onOpen={() => closeMainWindow({ popToRootType: PopToRootType.Immediate })}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
