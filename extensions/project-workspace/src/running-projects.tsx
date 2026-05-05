import { Action, ActionPanel, Color, Icon, LaunchType, List, launchCommand, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

import { loadHydratedProjectCache } from "./project-records";
import { confirmAndKillProcess } from "./runtime-actions";
import { getRunningProjectProcesses } from "./runtime";
import { getProjectTitle, scanProjects } from "./scanner";
import { loadStorageState, saveProjectCache } from "./storage";
import { RunningProjectProcess, ScanRoot } from "./types";

export default function Command() {
  const [scanRoots, setScanRoots] = useState<ScanRoot[]>([]);
  const [runningProjects, setRunningProjects] = useState<RunningProjectProcess[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async (shouldRescan = false) => {
    setIsLoading(true);

    try {
      const storageState = await loadStorageState();
      setScanRoots(storageState.scanRoots);

      if (storageState.scanRoots.length === 0) {
        setRunningProjects([]);
        return;
      }

      const cachedProjects = await loadHydratedProjectCache(storageState);

      if (cachedProjects.length > 0) {
        setRunningProjects(await getRunningProjectProcesses(cachedProjects));

        if (!shouldRescan) {
          return;
        }
      }

      if (shouldRescan || cachedProjects.length === 0) {
        const scannedProjects = await scanProjects(storageState);
        await saveProjectCache(scannedProjects);
        setRunningProjects(await getRunningProjectProcesses(scannedProjects));
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to inspect running projects",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search running projects by name, port, or path">
      <List.EmptyView
        title={scanRoots.length === 0 ? "Set up List Projects first" : "No running projects"}
        description={
          scanRoots.length === 0
            ? "This command only checks paths already saved by List Projects."
            : "No listening processes were found inside your saved project paths."
        }
        icon={scanRoots.length === 0 ? Icon.List : Icon.Circle}
        actions={
          <ActionPanel>
            <Action
              title="Open List Projects"
              icon={Icon.List}
              onAction={() => void launchCommand({ name: "list-projects", type: LaunchType.UserInitiated })}
            />
            {scanRoots.length > 0 ? (
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void refresh(true)} />
            ) : null}
          </ActionPanel>
        }
      />
      {runningProjects.map((runningProject) => {
        const title = getRunningProjectTitle(runningProject);

        return (
          <List.Item
            key={runningProject.id}
            id={runningProject.id}
            icon={{ source: Icon.Circle, tintColor: Color.Green }}
            title={title}
            accessories={[
              { text: { value: `:${runningProject.process.port}`, color: Color.Green }, icon: Icon.Network },
              { text: { value: truncatePath(runningProject.scopePath), color: Color.SecondaryText } },
            ]}
            keywords={buildKeywords(runningProject, title)}
            actions={<RunningProjectActions runningProject={runningProject} onRefresh={() => refresh(true)} />}
          />
        );
      })}
    </List>
  );
}

function RunningProjectActions({
  runningProject,
  onRefresh,
}: {
  runningProject: RunningProjectProcess;
  onRefresh: () => Promise<void> | void;
}) {
  return (
    <ActionPanel title={getRunningProjectTitle(runningProject)}>
      <ActionPanel.Section title="Runtime">
        <Action
          title={`Stop Port ${runningProject.process.port}`}
          icon={Icon.Stop}
          style={Action.Style.Destructive}
          onAction={() =>
            void confirmAndKillProcess(runningProject.process.pid, runningProject.process.port, onRefresh)
          }
        />
        <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void onRefresh()} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Open">
        <Action.Open title="Open Path" target={runningProject.scopePath} icon={Icon.Folder} />
        <Action.ShowInFinder path={runningProject.scopePath} />
        <Action.CopyToClipboard title="Copy Path" content={runningProject.scopePath} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Open List Projects"
          icon={Icon.List}
          onAction={() => void launchCommand({ name: "list-projects", type: LaunchType.UserInitiated })}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function getRunningProjectTitle(runningProject: RunningProjectProcess): string {
  const projectTitle = getProjectTitle(runningProject.project);
  return runningProject.scopeName ? `${projectTitle} · ${runningProject.scopeName}` : projectTitle;
}

function truncatePath(fullPath: string, maxSegments = 4): string {
  const segments = fullPath.replace(/\\/g, "/").split("/").filter(Boolean);

  if (segments.length <= maxSegments) {
    return fullPath;
  }

  return `…/${segments.slice(-maxSegments).join("/")}`;
}

function buildKeywords(runningProject: RunningProjectProcess, title: string): string[] {
  return [
    title,
    getProjectTitle(runningProject.project),
    runningProject.scopeName,
    runningProject.scopePath,
    runningProject.scopeRelativePath,
    runningProject.project.path,
    String(runningProject.process.port),
    String(runningProject.process.pid),
    runningProject.process.command,
  ].filter((value): value is string => Boolean(value));
}
