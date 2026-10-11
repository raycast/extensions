import { getPreferenceValues, open } from "@raycast/api";
import { execFile } from "node:child_process";
import { encodePath } from "./format";

export type Editor = Preferences.SearchContents["editor"];

const NAMES: Record<Editor, string> = {
  default: "Default App",
  vscode: "Visual Studio Code",
  cursor: "Cursor",
  zed: "Zed",
  xcode: "Xcode",
};

export function preferredEditor(): Editor {
  return getPreferenceValues<Preferences.SearchContents>().editor ?? "default";
}

export function editorName(editor: Editor) {
  return NAMES[editor];
}

/** Opens the file with the cursor on `line` in editors that support it. */
export async function openAtLine(path: string, line: number, editor: Editor) {
  switch (editor) {
    case "vscode":
    case "cursor":
    case "zed":
      return open(`${editor}://file${encodePath(path)}:${line}`);
    case "xcode":
      return new Promise<void>((resolve, reject) =>
        execFile("/usr/bin/xed", ["--line", String(line), path], (error) => (error ? reject(error) : resolve())),
      );
    default:
      return open(path);
  }
}
