// The editors code results open in, at the line that matched, and how each is told the line (DigUp: CodeEditors.swift).
// Pure: no @raycast/api (test/results.test.ts). src/ui/open.ts runs the plans.

import { pathToFileURL } from "node:url";

export type EditorMethod =
  /** "vscode://file/<path>:<line>:1" */
  | { kind: "fileURL"; scheme: string }
  /** A command inside the app bundle that takes "<path>:<line>" (Zed's `cli`, Sublime Text's `subl`). */
  | { kind: "command"; path: string }
  /** Xcode's `xed --line <line> <path>`. */
  | { kind: "xed" }
  /** JetBrains IDEs: their launcher takes `--line <line> <path>`. */
  | { kind: "jetBrains" }
  /** "txmt://open?url=file://<path>&line=<line>" (TextMate, BBEdit). */
  | { kind: "openURL"; scheme: string };

export interface CodeEditor {
  /** Bundle id. */
  id: string;
  name: string;
  method: EditorMethod;
}

const jetBrains = (id: string, name: string): CodeEditor => ({ id, name, method: { kind: "jetBrains" } });

/** DigUp's table, in its order ("first installed" follows it). */
export const CODE_EDITORS: readonly CodeEditor[] = [
  { id: "dev.zed.Zed", name: "Zed", method: { kind: "command", path: "Contents/MacOS/cli" } },
  { id: "dev.zed.Zed-Preview", name: "Zed Preview", method: { kind: "command", path: "Contents/MacOS/cli" } },
  { id: "com.todesktop.230313mzl4w4u92", name: "Cursor", method: { kind: "fileURL", scheme: "cursor" } },
  { id: "com.microsoft.VSCode", name: "Visual Studio Code", method: { kind: "fileURL", scheme: "vscode" } },
  {
    id: "com.microsoft.VSCodeInsiders",
    name: "VS Code Insiders",
    method: { kind: "fileURL", scheme: "vscode-insiders" },
  },
  { id: "com.exafunction.windsurf", name: "Windsurf", method: { kind: "fileURL", scheme: "windsurf" } },
  { id: "com.vscodium", name: "VSCodium", method: { kind: "fileURL", scheme: "vscodium" } },
  {
    id: "com.sublimetext.4",
    name: "Sublime Text",
    method: { kind: "command", path: "Contents/SharedSupport/bin/subl" },
  },
  {
    id: "com.sublimetext.3",
    name: "Sublime Text 3",
    method: { kind: "command", path: "Contents/SharedSupport/bin/subl" },
  },
  jetBrains("com.jetbrains.pycharm", "PyCharm"),
  jetBrains("com.jetbrains.pycharm.ce", "PyCharm CE"),
  jetBrains("com.jetbrains.intellij", "IntelliJ IDEA"),
  jetBrains("com.jetbrains.intellij.ce", "IntelliJ IDEA CE"),
  jetBrains("com.jetbrains.WebStorm", "WebStorm"),
  jetBrains("com.jetbrains.CLion", "CLion"),
  jetBrains("com.jetbrains.goland", "GoLand"),
  jetBrains("com.jetbrains.rustrover", "RustRover"),
  jetBrains("com.jetbrains.PhpStorm", "PhpStorm"),
  jetBrains("com.jetbrains.rubymine", "RubyMine"),
  jetBrains("com.google.android.studio", "Android Studio"),
  { id: "com.apple.dt.Xcode", name: "Xcode", method: { kind: "xed" } },
  { id: "com.barebones.bbedit", name: "BBEdit", method: { kind: "openURL", scheme: "x-bbedit" } },
  { id: "com.macromates.TextMate", name: "TextMate", method: { kind: "openURL", scheme: "txmt" } },
];

/**
 * The editor for the `codeEditor` preference: "auto" (or unset) is the first installed one in the table, "default"
 * (or no editor installed) is null, the file's default app; a bundle id is that editor if it is installed, else "auto".
 */
export function chooseEditor(preference: string | undefined, installed: ReadonlySet<string>): CodeEditor | null {
  if (preference === "default") return null;
  if (preference && preference !== "auto") {
    const picked = CODE_EDITORS.find((editor) => editor.id === preference && installed.has(editor.id));
    if (picked) return picked;
  }
  return CODE_EDITORS.find((editor) => installed.has(editor.id)) ?? null;
}

export type LaunchPlan =
  | { type: "url"; url: string }
  | { type: "exec"; file: string; args: string[] }
  /** Open the file in the app, at its start. */
  | { type: "plain" };

function encodePath(path: string): string {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

/**
 * How to open `path` at `line` (from 1) in `editor`, installed at `appPath`. `jetBrainsExecutable` is the app's own
 * launcher (its CFBundleExecutable inside Contents/MacOS); without it, JetBrains' "idea".
 */
export function launchPlan(
  editor: CodeEditor,
  appPath: string,
  path: string,
  line: number,
  jetBrainsExecutable?: string,
): LaunchPlan {
  const method = editor.method;
  switch (method.kind) {
    case "fileURL":
      return { type: "url", url: `${method.scheme}://file${encodePath(path)}:${line}:1` };
    case "openURL":
      return {
        type: "url",
        url: `${method.scheme}://open?url=${encodeURIComponent(pathToFileURL(path).href)}&line=${line}`,
      };
    case "command":
      return { type: "exec", file: `${appPath}/${method.path}`, args: [`${path}:${line}`] };
    case "xed":
      return { type: "exec", file: `${appPath}/Contents/Developer/usr/bin/xed`, args: ["--line", String(line), path] };
    case "jetBrains":
      return {
        type: "exec",
        file: `${appPath}/Contents/MacOS/${jetBrainsExecutable || "idea"}`,
        args: ["--line", String(line), path],
      };
  }
}
