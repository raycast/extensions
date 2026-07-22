import type { QuickShellSettings, Workspace } from "./schema";
import {
  assessWorkspaceHealthForList,
  collectCandidatePorts,
  probePortInUse,
  type PortInUseProbe,
  type WorkspaceHealthReport,
} from "./workspace-health";

export type WorkspaceHealthIndex = Map<string, WorkspaceHealthReport>;

function settingsFingerprint(settings: QuickShellSettings): string {
  return `${settings.terminalApplication}|${settings.defaultProfile}|${settings.recentWorkspaceCount}|${settings.blockDirtyBranchSwitch}`;
}

function workspaceHealthFingerprint(workspace: Workspace, settings: QuickShellSettings): string {
  const launchFingerprint = workspace.launches
    .map(
      (launch) =>
        `${launch.id}:${launch.isEnabled}:${launch.command ?? ""}:${launch.terminal}:${launch.wtProfile ?? ""}:${launch.runAsAdmin}`,
    )
    .join("|");

  return [
    workspace.id,
    workspace.name,
    workspace.directory,
    workspace.companionAppPath ?? "",
    workspace.openCompanionAppOnLaunch ? "1" : "0",
    workspace.devServerUrl ?? "",
    workspace.openDevServerOnLaunch ? "1" : "0",
    launchFingerprint,
    settingsFingerprint(settings),
  ].join(":");
}

export function buildWorkspaceHealthIndex(
  workspaces: Workspace[],
  settings: QuickShellSettings,
  isPortInUse?: PortInUseProbe,
): WorkspaceHealthIndex {
  const index: WorkspaceHealthIndex = new Map();
  for (const workspace of workspaces) {
    index.set(
      workspaceHealthFingerprint(workspace, settings),
      assessWorkspaceHealthForList(workspace, settings, { isPortInUse }),
    );
  }
  return index;
}

export async function buildWorkspaceHealthIndexWithPorts(
  workspaces: Workspace[],
  settings: QuickShellSettings,
): Promise<WorkspaceHealthIndex> {
  const candidatePorts = new Set<number>();
  for (const workspace of workspaces) {
    for (const port of collectCandidatePorts(workspace)) {
      candidatePorts.add(port);
    }
  }

  const portsInUse = new Set<number>();
  await Promise.all(
    [...candidatePorts].map(async (port) => {
      if (await probePortInUse(port)) {
        portsInUse.add(port);
      }
    }),
  );
  const isPortInUse: PortInUseProbe = (port) => portsInUse.has(port);

  const entries = workspaces.map(
    (workspace) =>
      [
        workspaceHealthFingerprint(workspace, settings),
        assessWorkspaceHealthForList(workspace, settings, { isPortInUse }),
      ] as const,
  );
  return new Map(entries);
}

export function lookupWorkspaceHealth(
  index: WorkspaceHealthIndex,
  workspace: Workspace,
  settings: QuickShellSettings,
): WorkspaceHealthReport {
  const key = workspaceHealthFingerprint(workspace, settings);
  return index.get(key) ?? assessWorkspaceHealthForList(workspace, settings);
}

export { assessWorkspaceHealthForLaunch } from "./workspace-health";
