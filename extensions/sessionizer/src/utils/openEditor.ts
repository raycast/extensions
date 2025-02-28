import { execSync } from "node:child_process";
import { Application, getPreferenceValues } from "@raycast/api";
import { join } from "node:path";
import { existsSync, lstatSync } from "node:fs";

interface Preferences {
  projectsDirectoryLevels: string;
  projectsDirectoryPath: string;
  preferredEditor: Application;
  terminalEmulatorPath: string;
  sessionizerPath: string;
}

const preferences = getPreferenceValues<Preferences>();

export type RelativePath = string;

export function assertValidPath(path: RelativePath): asserts path is RelativePath {
  const containsSpecialCharacters = /[^a-zA-Z0-9/_-]/g;
  const containsRepeatingSlashes = /\/{2,}/g;
  const containsLeadTrailingSlashes = /^\/|\/$/;
  const containsSlashesMidString = /^.+\/.+?/;

  if (containsSpecialCharacters.test(path)) {
    throw new Error("The path contains special characters.");
  }
  if (containsRepeatingSlashes.test(path)) {
    throw new Error("The path contains repeating slashes.");
  }
  if (containsLeadTrailingSlashes.test(path)) {
    throw new Error("The path contains leading or trailing slashes.");
  }
  // XOR if the path is valid relative to the projects directory levels.
  // This only works while the directory levels are 1 or 2.
  if ((preferences.projectsDirectoryLevels === "2") !== containsSlashesMidString.test(path)) {
    throw new Error("Level mismatch with the projects directory levels.");
  }
}

export function openInEditor(editor: string, path: RelativePath): void {
  // Use the assertion function.
  assertValidPath(path);

  // Join the path with the projects directory path
  const fullPath = join(preferences.projectsDirectoryPath, path);

  // Check if path resolves to a directory, otherwise create it.
  // If a matching file is found, a folder will still be created instead.
  if (!existsSync(fullPath) || !lstatSync(fullPath).isDirectory()) {
    execSync(`mkdir -p "${fullPath}"`);
  }

  let command = "";
  switch (editor) {
    case "code":
      command = `open -a ${preferences.preferredEditor.path?.replace(/ /g, "\\ ")} "${fullPath}"`;
      break;
    default:
      throw new Error("Missing or unsupported editor.");
  }
  execSync(command);
}
