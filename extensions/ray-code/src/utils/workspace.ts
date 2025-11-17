import { getPreferenceValues } from "@raycast/api";
import { resolve, relative } from "node:path";

export const getWorkspaceRoot = () => {
  const preferences = getPreferenceValues<{ workspaceRoot: string }>();

  if (!preferences.workspaceRoot) {
    throw new Error("Workspace root directory is not configured. Please set it in the extension preferences.");
  }

  return resolve(preferences.workspaceRoot);
};

export const resolveAndValidatePath = (userPath: string) => {
  if (!userPath) {
    throw new Error("Path is required");
  }

  const workspaceRoot = getWorkspaceRoot();

  const absolutePath = resolve(workspaceRoot, userPath);

  const normalizedWorkspaceRoot = resolve(workspaceRoot);
  const normalizedAbsolutePath = resolve(absolutePath);

  const relativePath = relative(normalizedWorkspaceRoot, normalizedAbsolutePath);

  if (relativePath.startsWith("..") || relativePath === "..") {
    throw new Error(
      `Path "${userPath}" is outside the configured workspace root "${workspaceRoot}". ` +
        "All file operations must be within the workspace root directory.",
    );
  }

  return normalizedAbsolutePath;
};
