import { execSync } from "node:child_process";
import { Application, getPreferenceValues } from "@raycast/api";
import { join } from "node:path";

interface Preferences {
  projectsDirectoryPath: string;
  preferredEditor: Application;
  terminalEmulatorPath: string;
  sessionizerPath: string;
}

const preferences = getPreferenceValues<Preferences>();

export function openInEditor(editor: string, path: string): void {
  const fullPath = join(preferences.projectsDirectoryPath, path);
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
