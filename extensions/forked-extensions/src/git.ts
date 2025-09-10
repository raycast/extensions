import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import spawn from "nano-spawn";
import * as api from "./api.js";
import { defaultGitExecutableFilePath } from "./constants.js";
import { ForkedExtension } from "./types.js";
import { gitExecutableFilePath, getRemoteUrl, repositoryConfigurationPath } from "./utils.js";

/**
 * The path to the Git executable file.
 * @remarks
 * Windows does not support paths with spaces without quotes, like `C:\Program Files\Git\cmd\git.exe`.
 * So we need to add quotes around the path if it contains spaces and is not already quoted.
 */
const gitFilePath =
  os.platform() === "win32" &&
  gitExecutableFilePath?.includes(" ") &&
  !(gitExecutableFilePath?.startsWith('"') && gitExecutableFilePath?.endsWith('"'))
    ? `"${gitExecutableFilePath}"`
    : gitExecutableFilePath || defaultGitExecutableFilePath;

/**
 * Resolves the path to the repository configuration.
 * @remarks If the path starts with `~/`, it will be resolved to the user's home directory.
 * @param input The input path to resolve.
 * @returns The resolved path.
 */
const resolvePath = (input: string) =>
  input.startsWith("~/") ? path.join(process.env.HOME || "", input.slice(2)) : input;

/**
 * The path to the repository where forked extensions are managed.
 */
export const repositoryPath = resolvePath(repositoryConfigurationPath);

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
  const untrackedExtensions = validExtensions.filter(
    (x) => !sparseCheckoutExtensions.includes(`extensions/${x.folderName}`),
  );
  if (untrackedExtensions.length > 0) await sparseCheckoutAdd(untrackedExtensions.map((x) => x.folderName));
  return validExtensions;
};

/**
 * Executes a git command in the repository root directory.
 * @param args The arguments to pass to the git command.
 * @returns The subprocess result of the git command execution.
 */
export const git = async (args: string[]) => spawn(gitFilePath, args, { cwd: repositoryPath, shell: true });

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
  const gitExists = await fileExists(path.join(repositoryPath, ".git"));
  if (!gitExists) return "";
  const { output } = await git(["remote", "get-url", "origin"]);
  const existingRepository = output.replace(/^(https:\/\/github.com\/|git@github\.com:)/, "").replace(/\.git$/, "");
  return existingRepository;
};

/**
 * Initializes the repository by cloning it if it doesn't exist.
 * @returns The full name of the forked repository.
 */
export const initRepository = async () => {
  const localForkedRepository = await getForkedRepository();
  if (localForkedRepository) return localForkedRepository;
  const forkedRepository = await api.getForkedRepository();
  await spawn(
    gitFilePath,
    ["clone", "--filter=blob:none", "--no-checkout", getRemoteUrl(forkedRepository), repositoryPath],
    {
      shell: true,
    },
  );
  await git(["sparse-checkout", "set", "--cone"]);
  await git(["checkout", "main"]);
  return forkedRepository;
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
};

/**
 * Checks if the current working directory is in clean status.
 */
export const isStatusClean = async () => {
  const { output } = await git(["status", "--porcelain"]);
  if (output.trim() === "") return;
  throw new Error("The repository is not clean. Please commit or stash your changes before proceeding.");
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
  const { output } = await git(["branch", "--show-current"]);
  const currentBranch = output.trim();
  await git(["fetch", "upstream"]);
  if (currentBranch !== "main") await git(["checkout", "main"]);
  await git(["merge", "--ff-only", "upstream/main"]);
  if (currentBranch !== "main") await git(["checkout", currentBranch]);
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
 * @param extensionFolders The target extension folder names. The values should be folder names only, without the `extensions/` prefix and slashes.
 */
export const sparseCheckoutAdd = async (extensionFolders: string[]) => {
  const extensionPaths = extensionFolders.map((x) => path.join("extensions", x));
  await git(["sparse-checkout", "add", ...extensionPaths]);
};

/**
 * Removes extension folders from the sparse-checkout list.
 * @param extensionFolders The target extension folder names. The values should be folder names only, without the `extensions/` prefix and slashes.
 */
export const sparseCheckoutRemove = async (extensionFolders: string[]) => {
  const sparseCheckoutInfoPath = path.join(repositoryPath, ".git", "info", "sparse-checkout");
  const sparseCheckoutInfo = await fs.readFile(sparseCheckoutInfoPath, "utf-8");
  const lines = sparseCheckoutInfo.split("\n");
  const toBeRemovedFolders = new Set(extensionFolders.map((x) => `/extensions/${x}/`));
  const updatedInfo = lines.filter((x) => !toBeRemovedFolders.has(x)).join("\n");
  await fs.writeFile(sparseCheckoutInfoPath, updatedInfo, "utf-8");
  await git(["sparse-checkout", "reapply"]);
};
