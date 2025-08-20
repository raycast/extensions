import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import spawn from "nano-spawn";
import { getPreferenceValues } from "@raycast/api";
import { ForkedExtension } from "./types.js";

const { repositoryConfigurationPath, forkedRepository } = getPreferenceValues<ExtensionPreferences>();

const resolvePath = (input: string) =>
  input.startsWith("~/") ? path.join(process.env.HOME || "", input.slice(2)) : input;

export const repositoryPath = resolvePath(repositoryConfigurationPath);

export const git = async (args: string[]) => {
  await spawn("git", args, { cwd: repositoryPath });
};

export const fileExists = async (input: string) =>
  fs
    .access(input, fs.constants.R_OK | fs.constants.W_OK)
    .then(() => true)
    .catch(() => false);

export const initRepository = async () => {
  const gitExists = await fileExists(path.join(repositoryPath, ".git"));
  if (gitExists) return;

  await spawn("git", [
    "clone",
    "--filter=blob:none",
    "--no-checkout",
    `https://github.com/${forkedRepository}.git`,
    repositoryPath,
  ]);
  await git(["sparse-checkout", "set", "--cone"]);
  await git(["checkout", "main"]);
};

export const getExtensionList = async () => {
  const repositoryExists = await fileExists(repositoryPath);
  if (!repositoryExists) throw new Error(`Repository does not exist: ${repositoryPath}`);

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

// [TODO] We should check if the repository is clean before pulling
export const pull = async () => git(["pull"]);

export const sparseCheckoutAdd = async (extensionFolder: string) =>
  git(["sparse-checkout", "add", path.join("extensions", extensionFolder)]);

export const sparseCheckoutRemove = async (extensionFolder: string) => {
  const sparseCheckoutInfoPath = path.join(repositoryPath, ".git", "info", "sparse-checkout");
  const sparseCheckoutInfo = await fs.readFile(sparseCheckoutInfoPath, "utf-8");
  const lines = sparseCheckoutInfo.split("\n");
  const updatedInfo = lines.filter((x) => x !== `/extensions/${extensionFolder}/`).join("\n");
  await fs.writeFile(sparseCheckoutInfoPath, updatedInfo, "utf-8");
  await git(["sparse-checkout", "reapply"]);
};
