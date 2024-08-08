import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import os from "os";
import path from "path";

interface Preferences {
  skhdrcPath?: string;
  editorCommand?: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  // Expand tilde to home directory
  const skhdrcPath = preferences.skhdrcPath 
    ? preferences.skhdrcPath.replace(/^~($|\/|\\)/, `${os.homedir()}$1`)
    : path.join(os.homedir(), ".config/skhd/skhdrc");
  const editorCommand = preferences.editorCommand || "open";
  const command = `${editorCommand} "${skhdrcPath}"`;

  exec(command, (error) => {
    if (error) {
      showToast(Toast.Style.Failure, "Failed to open skhdrc", String(error));
    } else {
      showToast(Toast.Style.Success, "skhdrc opened successfully");
    }
  });

  return null;
}
