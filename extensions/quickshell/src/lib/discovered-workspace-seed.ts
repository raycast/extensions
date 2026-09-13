import { deriveAbbreviationFromName, deriveNameFromDirectory } from "./directory-helpers";
import { tryGetGitRemoteUrl } from "./git-remote-url";
import { createStableId } from "./ids";
import type { WorkspaceSetupTask } from "./project-setup-suggestion";
import type { CompanionAppEntry, Workspace } from "./schema";
import { launchRowsFromSuggestions } from "./workspace-form-state";
import { normalizeWorkspace } from "./validation";

type DiscoveredWorkspaceSeed = {
  directory: string;
  name: string;
  remoteUrl?: string | null;
  devServerUrl?: string | null;
  tasks: WorkspaceSetupTask[];
  companionSeed?: Pick<CompanionAppEntry, "path" | "arguments"> | null;
};

/**
 * Full seed for a repository selected from Discover Git Repos.
 * Manual Add Workspace intentionally uses createWorkspaceFromDirectory instead.
 */
export function createWorkspaceFromDiscoveredGitRepo(seed: DiscoveredWorkspaceSeed): Workspace {
  const directory = seed.directory.trim();
  const name = seed.name.trim() || deriveNameFromDirectory(directory);
  const launches = launchRowsFromSuggestions(seed.tasks).map((row, index) => ({
    id: row.id,
    label: row.label,
    terminal: row.terminal,
    wtProfile: row.wtProfile ?? null,
    command: row.command || null,
    runAsAdmin: row.runAsAdmin,
    isEnabled: row.isEnabled,
    order: index,
    taskType: row.taskType || "none",
  }));

  return normalizeWorkspace({
    id: createStableId(),
    name,
    abbreviation: deriveAbbreviationFromName(name),
    directory,
    isPinned: false,
    pinOrder: null,
    lastUsedUtc: null,
    terminal: "default",
    wtProfile: null,
    command: null,
    runAsAdmin: false,
    repoUrl: seed.remoteUrl ?? tryGetGitRemoteUrl(directory),
    devServerUrl: seed.devServerUrl ?? null,
    // normalizeWorkspace supplies a usable blank launch when discovery finds no tasks.
    launches,
    companionApps: seed.companionSeed
      ? [
          {
            id: createStableId(),
            path: seed.companionSeed.path,
            arguments: seed.companionSeed.arguments ?? null,
            openOnLaunch: true,
            order: 0,
          },
        ]
      : [],
  });
}
