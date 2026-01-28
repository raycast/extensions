import { BARE_REPOSITORY, BARE_REPOSITORY_REMOTE_ORIGIN_FETCH } from "#/config/constants";
import { Repo } from "#/config/types";
import { getPreferences } from "#/helpers/raycast";
import { confirmAlert, Icon } from "@raycast/api";
import type { ExecOptions } from "child_process";
import parseUrl from "parse-url";
import * as path from "path";
import { executeCommand, removeFirstAndLastCharacter, removeNewLine } from "./general";

export const getRemoteOrigin = async () => {
  const command = "git remote";

  try {
    const { stdout } = await executeCommand(command);
    const origin = removeNewLine(stdout);

    return origin === "" ? null : origin;
  } catch {
    return null;
  }
};

export const getRemoteOriginUrl = async ({ path }: { path: string }) => {
  const command = `git -C ${path} remote get-url origin`;

  try {
    const { stdout } = await executeCommand(command);
    const origin = removeNewLine(stdout);

    return origin === "" ? null : origin;
  } catch {
    return null;
  }
};

export const isInsideBareRepository = async (path: string): Promise<boolean> => {
  try {
    const command = `git rev-parse --is-bare-repository`;
    const { stdout } = await executeCommand(command, { cwd: path });

    const result = removeNewLine(stdout);

    return result === "true";
  } catch {
    return false;
  }
};

export const setUpBareRepositoryFetch = async (path?: string) => {
  const pathCommand = path ? `-C ${path}` : "";
  const fetchOriginCommand = `git ${pathCommand} config remote.origin.fetch "${BARE_REPOSITORY_REMOTE_ORIGIN_FETCH}"`;

  try {
    const command = `git ${pathCommand} config remote.origin.fetch`;
    const { stdout } = await executeCommand(command);

    const remoteOriginFetch = removeNewLine(stdout);

    if (remoteOriginFetch === BARE_REPOSITORY_REMOTE_ORIGIN_FETCH) return;

    await executeCommand(fetchOriginCommand);
    return;
  } catch {
    try {
      await executeCommand(fetchOriginCommand);
    } catch (e: unknown) {
      if (e instanceof Error) throw e;
    }
  }
};

export const parseGitRemotes = async (fullPath: string): Promise<Repo[]> => {
  const remoteUrl = await getRemoteOriginUrl({ path: fullPath });
  if (!remoteUrl) return [];

  const parsed = parseUrl(remoteUrl);
  if (!parsed || !parsed.host || !parsed.pathname) return [];

  const icon = {
    source: {
      light: Icon.Globe as Icon | string,
      dark: Icon.Globe as Icon | string,
    },
  };

  if (parsed.host.includes("github")) {
    icon.source.light = "github-light.png";
    icon.source.dark = "github-dark.png";
  }

  if (parsed.host.includes("gitlab")) {
    icon.source.light = "gitlab-light.png";
    icon.source.dark = "gitlab-dark.png";
  }

  if (parsed.host.includes("bitbucket")) {
    icon.source.light = "bitbucket-light.png";
    icon.source.dark = "bitbucket-dark.png";
  }

  const protocol = "https";
  const url = `${protocol}://${parsed.host}${parsed.pathname.replace(".git", "")}`;

  return [
    {
      name: "origin",
      host: parsed.host,
      hostDisplayName: parsed.host.split(".")[0].charAt(0).toUpperCase() + parsed.host.split(".")[0].slice(1),
      url: url,
      icon: icon,
    },
  ];
};

export const cloneBareRepository = async ({ path, url }: { path: string; url: string }) => {
  return executeCommand(`git -C ${path} clone --bare "${url}" './.bare'`);
};

export const removeWorktree = ({
  parentPath,
  worktreeName,
  force = false,
}: {
  parentPath: string;
  worktreeName: string;
  force?: boolean;
}) => {
  return executeCommand(`git -C ${parentPath} worktree remove ${force ? "-f" : ""} ./${worktreeName}`);
};

export const pruneWorktrees = async ({ path }: { path: string }) => {
  return executeCommand(`git -C ${path} worktree prune`);
};

export const removeBranch = async ({ path, branch }: { path: string; branch: string }) => {
  return executeCommand(`git -C ${path} branch -D ${branch}`);
};

export const moveWorktree = async ({
  path,
  currentName,
  newName,
}: {
  path: string;
  currentName: string;
  newName: string;
}) => {
  const moveWorktree = `git -C ${path} worktree move ${currentName} ${newName}`;

  return executeCommand(moveWorktree);
};

export const renameBranch = async ({ path, newBranchName }: { path: string; newBranchName: string }) => {
  const renameBranch = `git -C ${path} branch -m ${newBranchName}`;

  return executeCommand(renameBranch);
};

export const renameWorktree = async ({
  parentPath,
  currentName,
  newName,
}: {
  parentPath: string;
  currentName: string;
  newName: string;
}) => {
  const newPath = path.join(parentPath, newName);

  await moveWorktree({ path: parentPath, currentName, newName });

  await renameBranch({ path: newPath, newBranchName: newName });

  return {
    path: newPath,
  };
};

export const fetch = async (path?: string) => {
  try {
    const command = `git -C ${path} fetch --all --prune`;
    await executeCommand(command);
  } catch (e: unknown) {
    throw Error(e instanceof Error ? e.message : "Unknown error occurred");
  }
};

export const checkIfBranchNameIsValid = async ({ path, name }: { path?: string; name: string }) => {
  const command = `git -C ${path} check-ref-format --branch '${name}'`;

  try {
    await executeCommand(command);

    return true;
  } catch {
    return false;
  }
};

export const getRemoteBranches = async (
  { path }: { path?: string },
  options?: ExecOptions | undefined,
): Promise<string[]> => {
  try {
    const command = `git -C ${path} branch -r`;
    const { stdout } = await executeCommand(command, options);

    if (!stdout) return [];

    return stdout
      .split("\n")
      .filter((line: string) => line !== "")
      .filter((line: string) => !line.includes("->"))
      .filter((line: string) => line.startsWith("  origin/"))
      .map((line: string) => line.substring("  origin/".length))
      .map((branch: string) => branch.trim());
  } catch (e: unknown) {
    throw Error(e instanceof Error ? e.message : "Unknown error occurred");
  }
};

export const getLocalWorktrees = async ({
  path,
  includeBare = false,
  showCurrentWorktree = false,
}: {
  path: string;
  includeBare?: boolean;
  showCurrentWorktree?: boolean;
}) => {
  const command = `git -C ${path} worktree list`;

  try {
    const { stdout } = await executeCommand(command);

    const worktrees = await getFilteredWorktrees(stdout, includeBare, showCurrentWorktree);

    return worktrees;
  } catch (e: unknown) {
    throw Error(e instanceof Error ? e.message : "Unknown error occurred");
  }
};

export const getCurrentBranchName = async () => {
  try {
    const command = "git rev-parse --abbrev-ref HEAD";
    const { stdout } = await executeCommand(command);

    return stdout.split("\n")[0];
  } catch {
    return null;
  }
};

const getFilteredWorktrees = async (stdout: string, includeBare = false, showCurrentWorktree = false) => {
  const currentWorktree = await getCurrentBranchName();

  let splitWorktrees = stdout
    .split("\n")
    .filter((str) => str !== "")
    .map((str) => {
      const [path, hash, worktree] = str.split(" ").filter((str) => str !== "");

      return {
        path,
        hash: worktree ? hash : "",
        worktree: removeFirstAndLastCharacter(worktree ? worktree : hash),
      };
    });

  if (!showCurrentWorktree) splitWorktrees = splitWorktrees.filter((worktree) => worktree.worktree !== currentWorktree);

  if (!includeBare) splitWorktrees = splitWorktrees.filter(({ worktree }) => worktree !== BARE_REPOSITORY);

  return splitWorktrees;
};

export const pushNewBranchToRemote = async ({ path, branch }: { path: string; branch: string }) => {
  try {
    const { skipGitHooksWhenPushing } = getPreferences();
    const noVerifyFlag = skipGitHooksWhenPushing ? " --no-verify" : "";
    const command = `git -C ${path} push --set-upstream origin ${branch}${noVerifyFlag}`;
    await executeCommand(command);
  } catch (e: unknown) {
    throw Error(e instanceof Error ? e.message : "Unknown error occurred");
  }
};

export const shouldPushWorktree = async ({
  path,
  branch,
  onAccept,
}: {
  path: string;
  branch: string;
  onAccept?: () => void;
}) => {
  const { shouldAutomaticallyPushWorktree } = getPreferences();

  if (shouldAutomaticallyPushWorktree === "no") return;

  if (shouldAutomaticallyPushWorktree === "ask") {
    const confirmed = await confirmAlert({
      title: `Do you want to push to '${branch}' to remote?`,
    });

    if (!confirmed) return;
  }

  onAccept?.();

  await pushNewBranchToRemote({ path, branch });
};

export const checkIfBranchExistsOnRemote = async ({ path, branch }: { path: string; branch: string }) => {
  try {
    const command = `git -C ${path} ls-remote origin ${branch}`;
    const { stdout } = await executeCommand(command);

    if (!stdout) return false;

    return true;
  } catch (e: unknown) {
    throw Error(e instanceof Error ? e.message : "Unknown error occurred");
  }
};

export const getCurrentCommit = async ({ path }: { path: string }) => {
  try {
    const command = `git -C ${path} rev-parse HEAD`;
    const { stdout } = await executeCommand(command);

    if (!stdout) return null;

    return stdout.trim();
  } catch {
    return null;
  }
};

export const pullBranchChanges = async ({ path }: { path: string }) => {
  try {
    const command = `git -C ${path} pull`;
    await executeCommand(command);
  } catch (e: unknown) {
    throw Error(e instanceof Error ? e.message : "Unknown error occurred");
  }
};

export const addRemoteWorktree = async ({
  remoteBranch,
  newWorktreePath,
  parentPath,
}: {
  remoteBranch: string;
  newWorktreePath: string;
  parentPath: string;
}) => {
  try {
    const worktreeAddCommand = `git -C ${parentPath} worktree add --track -B ${remoteBranch} ${newWorktreePath} origin/${remoteBranch}`;
    await executeCommand(worktreeAddCommand);
  } catch (e: unknown) {
    throw Error(e instanceof Error ? e.message : "Unknown error occurred");
  }
};

export const addNewWorktree = async ({
  newBranch,
  newWorktreePath,
  trackingBranch,
  parentPath,
}: {
  newBranch: string;
  trackingBranch: string;
  newWorktreePath: string;
  parentPath: string;
}) => {
  try {
    const addCommand = `git -C ${parentPath} worktree add --track -B ${newBranch} ${newWorktreePath} origin/${trackingBranch}`;

    await executeCommand(addCommand);
  } catch (e: unknown) {
    throw Error(e instanceof Error ? e.message : "Unknown error occurred");
  }
};
