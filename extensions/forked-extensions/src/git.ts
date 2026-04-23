import fs from "node:fs/promises";
import path from "node:path";
import { confirmAlert } from "@raycast/api";
import spawn from "nano-spawn";
import * as api from "./api.js";
import { defaultGitExecutableFilePath, upstreamRepository } from "./constants.js";
import { catchError } from "./errors.js";
import operation from "./operation.js";
import { ForkedExtension } from "./types.js";
import {
  gitExecutableFilePath,
  getRemoteUrl,
  repositoryConfigurationPath,
  addQuotesIfInWindows,
  resolvePath,
} from "./utils.js";

/**
 * The path to the Git executable file.
 * @remarks
 * Windows does not support paths with spaces without quotes, like `C:\Program Files\Git\cmd\git.exe`.
 * So we need to add quotes around the path if it contains spaces and is not already quoted.
 */
const gitFilePath = addQuotesIfInWindows(gitExecutableFilePath || defaultGitExecutableFilePath);

/**
 * The configured directory from extension preferences.
 */
export const repositoryConfigurationRootPath = resolvePath(repositoryConfigurationPath);

/**
 * The default directory name used for the managed repository.
 */
const repositoryDirectoryName = "forked-extensions";

/**
 * The default repository path derived from the configured directory.
 */
const defaultRepositoryPath =
  path.basename(repositoryConfigurationRootPath) === repositoryDirectoryName
    ? repositoryConfigurationRootPath
    : path.join(repositoryConfigurationRootPath, repositoryDirectoryName);

/**
 * The effective path to the repository where forked extensions are managed.
 * @remarks This can resolve either to the configured directory itself or to its `forked-extensions` child directory.
 */
export let repositoryPath = defaultRepositoryPath;

/**
 * Whether the effective repository path has already been resolved.
 */
let repositoryPathResolved = false;

/**
 * The partial clone filter used for clone and fetch operations.
 */
const partialCloneFilter = "tree:0";

/**
 * The default branch used for synchronization operations.
 */
const mainBranch = "main";

/**
 * Executes a git command in a specific repository directory.
 * @param args The arguments to pass to the git command.
 * @param cwd The working directory where the git command should run.
 * @returns The subprocess result of the git command execution.
 */
const gitAtPath = async (args: string[], cwd: string) => spawn(gitFilePath, args, { cwd, shell: true });

/**
 * Normalizes a GitHub remote URL into a `owner/repository` string.
 * @param input The remote URL to normalize.
 * @returns The normalized repository full name.
 */
const normalizeRepositoryRemote = (input: string) =>
  input
    .trim()
    .replace(/^(https:\/\/github.com\/|git@github\.com:)/, "")
    .replace(/\.git$/, "");

/**
 * Returns the normalized repository full name for a remote in a repository path.
 * @param input The repository path to inspect.
 * @param remote The remote name to inspect.
 * @returns The normalized remote repository full name.
 */
const getRemoteRepositoryAtPath = async (input: string, remote: string) => {
  const { output } = await gitAtPath(["remote", "get-url", remote], input).catch(() => ({ output: "" }));
  return normalizeRepositoryRemote(output);
};

/**
 * Returns whether a repository path is already a managed forked extensions repository.
 * @param input The repository path to inspect.
 * @param forkedRepository Optional. The expected forked repository full name.
 * @returns Whether the path is already a managed forked extensions repository.
 */
const isManagedForkedRepository = async (input: string, forkedRepository?: string) => {
  const gitExists = await fileExists(path.join(input, ".git"));
  if (!gitExists) return false;

  const originRepository = await getRemoteRepositoryAtPath(input, "origin");
  if (!originRepository) return false;

  const upstreamRemote = await getRemoteRepositoryAtPath(input, "upstream");
  if (forkedRepository)
    return originRepository === forkedRepository && (upstreamRemote === "" || upstreamRemote === upstreamRepository);
  return upstreamRemote === upstreamRepository && originRepository !== upstreamRepository;
};

/**
 * Resolves the effective repository path based on the configured directory.
 * @param forkedRepository Optional. The expected forked repository full name.
 * @returns The resolved repository path.
 */
export const resolveRepositoryPath = async (forkedRepository?: string) => {
  if (await isManagedForkedRepository(repositoryConfigurationRootPath, forkedRepository)) {
    repositoryPath = repositoryConfigurationRootPath;
    repositoryPathResolved = true;
    return repositoryPath;
  }

  if (
    repositoryConfigurationRootPath !== defaultRepositoryPath &&
    (await isManagedForkedRepository(defaultRepositoryPath, forkedRepository))
  ) {
    repositoryPath = defaultRepositoryPath;
    repositoryPathResolved = true;
    return repositoryPath;
  }

  if (repositoryPathResolved) return repositoryPath;
  repositoryPath = defaultRepositoryPath;
  repositoryPathResolved = true;
  return repositoryPath;
};

/**
 * Checks if a file or directory exists and is readable and writable.
 * @param input The path to the file or directory to check.
 * @returns A promise that resolves to true if the file or directory exists and is accessible, false otherwise.
 */
export const fileExists = async (input: string) =>
  fs
    .access(input, fs.constants.R_OK | fs.constants.W_OK)
    .then(() => true)
    .catch(() => false);

/**
 * Retrieves the list of forked extensions from the repository.
 * @returns A promise that resolves to an array of ForkedExtension objects.
 */
export const getExtensionList = async () => {
  await resolveRepositoryPath();
  const repositoryExists = await fileExists(repositoryPath);
  if (!repositoryExists) return [];

  const extensionsFolder = path.join(repositoryPath, "extensions");
  const extensionsFolderExists = await fileExists(extensionsFolder);
  if (!extensionsFolderExists) return [];

  const files = await fs.readdir(extensionsFolder, { withFileTypes: true });

  const extensionFolders = files
    .filter((file) => file.isDirectory())
    .map((file) => ({ path: path.join(repositoryPath, "extensions", file.name), name: file.name }));

  const allExtension = await Promise.all(
    extensionFolders.map(async (extensionFolder) => {
      const json = JSON.parse(
        await fs.readFile(path.join(extensionFolder.path, "package.json"), "utf-8").catch(() => "{}"),
      ) as ForkedExtension;
      return { ...json, folderPath: extensionFolder.path, folderName: extensionFolder.name };
    }),
  );

  const validExtensions = allExtension.filter((extension) => Boolean(extension.name));
  const sparseCheckoutExtensions = await sparseCheckoutList();
  if (!sparseCheckoutExtensions) return [];
  const untrackedExtensions = validExtensions.filter(
    (x) => !sparseCheckoutExtensions.includes(`extensions/${x.folderName}`),
  );
  if (untrackedExtensions.length > 0)
    await sparseCheckoutAdd(untrackedExtensions.map((x) => `extensions/${x.folderName}`));
  return validExtensions;
};

/**
 * Executes a git command in the repository root directory.
 * @param args The arguments to pass to the git command.
 * @returns The subprocess result of the git command execution.
 */
export const git = async (args: string[]) => {
  await resolveRepositoryPath();
  return gitAtPath(args, repositoryPath);
};

/**
 * Checks if Git is valid by running `git --version`.
 * @returns True if Git is installed, false otherwise.
 */
export const checkIfGitIsValid = async () => {
  try {
    await spawn(gitFilePath, ["--version"], { shell: true });
    return true;
  } catch {
    return false;
  }
};

/**
 * Gets the name of the current branch.
 * @returns The name of the current branch as a string.
 */
export const getCurrentBranch = async () => {
  const { output } = await git(["branch", "--show-current"]);
  return output.trim();
};

/**
 * Configures a remote to use the optimized partial clone settings.
 * @param remote The remote name to configure.
 * @param mainOnly Whether the remote should only track the main branch.
 */
const configureOptimizedRemote = async (remote: string, mainOnly?: boolean) => {
  await git(["config", `remote.${remote}.promisor`, "true"]);
  await git(["config", `remote.${remote}.partialclonefilter`, partialCloneFilter]);
  await git(["config", `remote.${remote}.tagOpt`, "--no-tags"]);
  if (mainOnly) {
    await git([
      "config",
      "--replace-all",
      `remote.${remote}.fetch`,
      `+refs/heads/${mainBranch}:refs/remotes/${remote}/${mainBranch}`,
    ]);
  }
};

/**
 * Fetches and fast-forwards the local main branch from a remote main branch.
 * @param remote The remote name to update from.
 */
const updateFromRemoteMain = async (remote: string) => {
  const currentBranch = await getCurrentBranch();
  await git([
    "fetch",
    "--prune",
    "--no-tags",
    `--filter=${partialCloneFilter}`,
    remote,
    `+refs/heads/${mainBranch}:refs/remotes/${remote}/${mainBranch}`,
  ]);
  if (currentBranch !== mainBranch) await git(["checkout", mainBranch]);
  await git(["merge", "--ff-only", `${remote}/${mainBranch}`]);
  if (currentBranch !== mainBranch) await git(["checkout", currentBranch]);
};

/**
 * Gets the last full commit hash of the current branch.
 * @remarks Returns an empty string if the repository is not initialized.
 * @returns The last commit hash as a string.
 */
export const getLastCommitHash = async () => {
  const { output } = await git(["rev-parse", "HEAD"]).catch(() => ({ output: "" }));
  return output.trim();
};

/**
 * Gets the forked repository full name and whether it's newly cloned.
 * @returns An object containing the forked repository full name and a boolean indicating if it's newly cloned.
 */
export const getForkedRepository = async () => {
  await resolveRepositoryPath();
  const gitExists = await fileExists(path.join(repositoryPath, ".git"));
  if (!gitExists) return "";
  const { output } = await git(["remote", "get-url", "origin"]);
  const existingRepository = normalizeRepositoryRemote(output);
  return existingRepository;
};

/**
 * Gets the forked repository full name only when the resolved repository path already points to a managed fork.
 * @returns The forked repository full name, or an empty string if the current path is not a managed fork.
 */
export const getManagedForkedRepository = async () => {
  await resolveRepositoryPath();
  if (!(await isManagedForkedRepository(repositoryPath))) return "";
  return getForkedRepository();
};

/**
 * Converts a full checkout to a sparse checkout with cone mode.
 */
export const convertFullCheckoutToSparseCheckout = async () => {
  const { output } = await git(["remote"]);
  const remotes = output.split("\n").map((x) => x.trim());
  await configureOptimizedRemote("origin");
  if (remotes.includes("upstream")) await configureOptimizedRemote("upstream", true);
  await git(["sparse-checkout", "set", "--cone"]);
  await git(["checkout", mainBranch]);
};

/**
 * Initializes the repository by cloning it if it doesn't exist.
 * @param forkedRepository The full name of the forked repository.
 * @returns The full name of the forked repository.
 */
export const initRepository = async (forkedRepository?: string) => {
  const resolvedForkedRepository = forkedRepository ?? (await api.getForkedRepository());
  await resolveRepositoryPath(resolvedForkedRepository);
  const localForkedRepository = await getForkedRepository();
  if (localForkedRepository === resolvedForkedRepository) return localForkedRepository;
  await fs.mkdir(path.dirname(repositoryPath), { recursive: true });
  await spawn(
    gitFilePath,
    [
      "clone",
      `--filter=${partialCloneFilter}`,
      "--no-checkout",
      "--no-tags",
      getRemoteUrl(resolvedForkedRepository),
      addQuotesIfInWindows(repositoryPath),
    ],
    {
      shell: true,
    },
  );
  await convertFullCheckoutToSparseCheckout();
  return resolvedForkedRepository;
};

/**
 * Sets the upstream repository for the local repository.
 * @remarks This function checks if the upstream remote already exists and updates its URL or adds it if it doesn't.
 * @param forkedRepository The full name of the forked repository to set as upstream.
 */
export const setUpstream = async (forkedRepository: string) => {
  const { output } = await git(["remote"]);
  const remotes = output.split("\n").map((x) => x.trim());
  await git(["remote", remotes.includes("upstream") ? "set-url" : "add", "upstream", getRemoteUrl()]);
  await git(["remote", "set-url", "origin", getRemoteUrl(forkedRepository)]);
  await configureOptimizedRemote("origin");
  await configureOptimizedRemote("upstream", true);
};

/**
 * Checks if the current working directory is in clean status.
 */
export const checkIfStatusClean = async () => {
  const { output } = await git(["status", "--porcelain"]);
  if (output.trim() === "") return;
  throw new Error("The repository is not clean. Please commit or stash your changes before proceeding.");
};

/**
 * Checks if the repository enabled sparse-checkout.
 */
export const checkIfSparseCheckoutEnabled = async () => {
  const isSparseCheckout = await git(["sparse-checkout", "list"])
    .then(() => true)
    .catch(() => false);
  if (!isSparseCheckout) {
    return new Promise<void>((resolve, reject) => {
      confirmAlert({
        title: "Sparse Checkout Not Enabled",
        message: "This operation requires sparse checkout to be enabled. Would you like to enable it now?",
        primaryAction: {
          title: "Enable Sparse Checkout",
          onAction: catchError(async () => {
            await checkIfStatusClean();
            await operation.convertFullCheckoutToSparseCheckout();
            resolve();
          }),
        },
        dismissAction: {
          title: "Cancel",
          onAction: resolve,
        },
      }).catch(reject);
    });
  }
};

/**
 * Gets the number of commits the current branch is ahead and behind the upstream branch.
 * @returns An object containing the number of commits ahead and behind.
 */
export const getAheadBehindCommits = async () => {
  const { output } = await git(["rev-list", "--left-right", "--count", "HEAD..@{u}"]);
  const [ahead, behind] = output.split("\t").map(Number);
  return { ahead, behind };
};

/**
 * Synchronizes the forked repository with the upstream repository on local.
 * @remarks This will checkout to main branch and merge the upstream main branch into it.
 * @see {@link https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork#syncing-a-fork-branch-from-the-command-line|Syncing a fork}
 */
export const syncFork = async () => {
  await updateFromRemoteMain("upstream");
};

/**
 * Pulls the latest changes from the forked repository on local.
 * @remarks This will checkout to main branch and merge the origin main branch into it.
 */
export const pullFork = async () => {
  await updateFromRemoteMain("origin");
};

/**
 * Lists the folders in the sparse-checkout list.
 * @returns An array of folder names in the sparse-checkout list.
 */
export const sparseCheckoutList = async () => {
  const { output } = await git(["sparse-checkout", "list"]);
  return output
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
};

/**
 * Adds extension folders to the sparse-checkout list.
 * @param pattern The target pattern names.
 */
export const sparseCheckoutAdd = async (pattern: string[]) => {
  await git(["sparse-checkout", "add", ...pattern]);
};

/**
 * Removes extension folders from the sparse-checkout list.
 * @param pattern The target pattern names.
 */
export const sparseCheckoutRemove = async (pattern: string[]) => {
  await resolveRepositoryPath();
  const sparseCheckoutInfoPath = path.join(repositoryPath, ".git", "info", "sparse-checkout");
  const sparseCheckoutInfo = await fs.readFile(sparseCheckoutInfoPath, "utf-8");
  const lines = sparseCheckoutInfo.split("\n");
  const toBeRemovedFolders = new Set(pattern.map((x) => `/${x}/`));
  const updatedInfo = lines.filter((x) => !toBeRemovedFolders.has(x)).join("\n");
  await fs.writeFile(sparseCheckoutInfoPath, updatedInfo, "utf-8");
  await git(["sparse-checkout", "reapply"]);
};
