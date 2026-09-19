import { deriveNameFromDirectory } from "./directory-helpers";
import { detectDevServerUrl } from "./detect-dev-server-url";
import { tryGetGitRemoteUrl } from "./git-remote-url";
import { createStableId } from "./ids";
import type { Workspace } from "./schema";
import { normalizeWorkspace } from "./validation";

export function createBlankWorkspace(): Workspace {
  const id = createStableId();
  return normalizeWorkspace({
    id,
    name: "",
    abbreviation: null,
    directory: "",
    isPinned: false,
    pinOrder: null,
    lastUsedUtc: null,
    terminal: "default",
    wtProfile: null,
    command: null,
    runAsAdmin: false,
    launches: [
      {
        id: createStableId(),
        label: "Launch",
        terminal: "default",
        wtProfile: null,
        command: null,
        runAsAdmin: false,
        isEnabled: true,
        order: 0,
        taskType: "none",
      },
    ],
  });
}

/**
 * Manual create seed: name + optional git remote + optional detected dev-server URL.
 * Does not seed launches, companions, or abbreviation (Discover Git Repos owns full heuristics).
 */
export function createWorkspaceFromDirectory(directory: string | undefined): Workspace {
  const trimmed = directory?.trim();
  if (!trimmed) {
    return createBlankWorkspace();
  }

  const name = deriveNameFromDirectory(trimmed);
  return normalizeWorkspace({
    ...createBlankWorkspace(),
    name,
    directory: trimmed,
    repoUrl: tryGetGitRemoteUrl(trimmed),
    devServerUrl: detectDevServerUrl(trimmed),
  });
}
