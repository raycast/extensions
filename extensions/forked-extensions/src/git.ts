import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { getPreferenceValues } from "@raycast/api";
import spawn from "nano-spawn";
import * as api from "./api.js";
import { defaultGitExecutableFilePath } from "./constants.js";
import { ForkedExtension } from "./types.js";
import { getRemoteUrl } from "./utils.js";

const { gitExecutableFilePath = defaultGitExecutableFilePath, repositoryConfigurationPath } =
  getPreferenceValues<ExtensionPreferences>();

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

  return allExtension.filter((extension) => Boolean(extension.name));
};

/**
 * Executes a git command in the repository root directory.
 * @param args The arguments to pass to the git command.
 * @return The subprocess result of the git command execution.
 */
export const git = async (args: string[]) => spawn(gitExecutableFilePath, args, { cwd: repositoryPath, shell: true });

/**
 * Checks if Git is valid by running `git --version`.
 * @returns True if Git is installed, false otherwise.
 */
export const checkIfGitIsValid = async () => {
  try {
    await spawn(gitExecutableFilePath, ["--version"], { shell: true });
    return true;
  } catch {
    return false;
  }
};

/**
 * Initializes the repository by cloning it if it doesn't exist.
 * @returns The full name of the forked repository.
 */
export const initRepository = async () => {
  const gitExists = await fileExists(path.join(repositoryPath, ".git"));
  if (gitExists) {
    const { output } = await git(["remote", "get-url", "origin"]);
    const existiingRepository = output.replace(/^(https:\/\/github.com\/|git@github\.com:)/, "").replace(/\.git$/, "");
    return existiingRepository;
  }

  const forkedRepository = await api.getForkedRepository();
  await spawn(
    gitExecutableFilePath,
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
  return output.trim() === "";
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
 * Pulls the latest changes from the upstream repository.
 *
 * [TODO] We should check if the repository is clean before pulling
 *
 * @remarks
 *
 * - If the local branch is outdated, fast-forward it;
 * - If the local branch contains unpushed work, warn about it;
 * - If the branch seems merged and its upstream branch was deleted, delete it.
 */
export const pull = async () => {
  await git(["pull"]);
};

/**
 * Adds an extension folder to the sparse-checkout list.
 * @param extensionFolder The target extension folder name. The value should be folder name only, without the `extensions/` prefix and slashes.
 */
export const sparseCheckoutAdd = async (extensionFolder: string) => {
  await git(["sparse-checkout", "add", path.join("extensions", extensionFolder)]);
};

/**
 * Removes an extension folder from the sparse-checkout list.
 * @param extensionFolder The target extension folder name. The value should be folder name only, without the `extensions/` prefix and slashes.
 */
export const sparseCheckoutRemove = async (extensionFolder: string) => {
  const sparseCheckoutInfoPath = path.join(repositoryPath, ".git", "info", "sparse-checkout");
  const sparseCheckoutInfo = await fs.readFile(sparseCheckoutInfoPath, "utf-8");
  const lines = sparseCheckoutInfo.split("\n");
  const updatedInfo = lines.filter((x) => x !== `/extensions/${extensionFolder}/`).join("\n");
  await fs.writeFile(sparseCheckoutInfoPath, updatedInfo, "utf-8");
  await git(["sparse-checkout", "reapply"]);
};
