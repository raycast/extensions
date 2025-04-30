import { Action, ActionPanel, closeMainWindow, Icon, List, PopToRootType } from "@raycast/api";
import { runAppleScript, showFailureToast, useExec } from "@raycast/utils";
import { useMemo } from "react";
import { execSync } from "child_process";
import { CLIOutput, PreparedCLIOutput } from "./types.d";

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
    showFailureToast({ title: "Could not find BarCuts on your Mac, exiting!" });

    return (
      <List searchBarPlaceholder="BarCuts not found …">
        <List.EmptyView title="BarCuts Is Not Installed" icon={Icon.Warning} />
      </List>
    );
  }

  // Fetch data from BarCuts
  const { isLoading, data } = useExec(`${appPath}/Contents/MacOS/barcuts-cli`);

  // Parse BarCuts data
  const { appName, workflows } = useMemo<PreparedCLIOutput>(() => {
    try {
      const cliOutput: CLIOutput = JSON.parse(data || "{}") || {};
      return {
        appName: cliOutput.activeAppName,
        workflows: [
          ...cliOutput.activeWorkflows,
          ...(cliOutput.globalWorkflows || []).map((wf) => ({
            ...wf,
            isGlobal: true,
          })),
        ],
      };
    } catch (e) {
      console.error("Failed to parse BarCuts CLI output:", e);
      showFailureToast({
        title: "Failed to load workflow list",
        message: "Could not parse data from BarCuts CLI.",
      });
      return { appName: "", workflows: [] };
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
          subtitle={wf.isGlobal ? "Global workflow" : `${appName} workflow`}
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Play}
                title="Run Workflow"
                onAction={async () => {
                  await closeMainWindow({
                    popToRootType: PopToRootType.Immediate,
                  });
                  await runWorkflow(wf.workflowID);
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

async function runWorkflow(workflowID: string) {
  try {
    await runAppleScript(`
      tell application "Shortcuts Events"
        ignoring application responses
          run shortcut id "${workflowID}"
        end ignoring
      end tell
    `);
  } catch (error) {
    showFailureToast({ title: `Failed to run workflow: ${error}` });
  }
}
