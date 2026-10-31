import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Hit } from "../digup/protocol";

export type Method =
  /** "vscode://file/<path>:<line>:1" */
  | { type: "fileURL"; scheme: string }
  /** "txmt://open?url=file://<path>&line=<line>" */
  | { type: "openURL"; scheme: string }
  /** A command inside the app bundle that takes "<path>:<line>". */
  | { type: "command"; path: string }
  /** Xcode's `xed --line <line> <path>`. */
  | { type: "xed" }
  /** JetBrains IDEs: their launcher takes `--line <line> <path>`. */
  | { type: "jetBrains" };

export interface Editor {
  /** Bundle id. */
  id: string;
  name: string;
  method: Method;
}

const jetBrains = (id: string, name: string): Editor => ({ id, name, method: { type: "jetBrains" } });

export const KNOWN_EDITORS: Editor[] = [
  { id: "dev.zed.Zed", name: "Zed", method: { type: "command", path: "Contents/MacOS/cli" } },
  { id: "dev.zed.Zed-Preview", name: "Zed Preview", method: { type: "command", path: "Contents/MacOS/cli" } },
  { id: "com.todesktop.230313mzl4w4u92", name: "Cursor", method: { type: "fileURL", scheme: "cursor" } },
  { id: "com.microsoft.VSCode", name: "Visual Studio Code", method: { type: "fileURL", scheme: "vscode" } },
  {
    id: "com.microsoft.VSCodeInsiders",
    name: "VS Code Insiders",
    method: { type: "fileURL", scheme: "vscode-insiders" },
  },
  { id: "com.exafunction.windsurf", name: "Windsurf", method: { type: "fileURL", scheme: "windsurf" } },
  { id: "com.vscodium", name: "VSCodium", method: { type: "fileURL", scheme: "vscodium" } },
  {
    id: "com.sublimetext.4",
    name: "Sublime Text",
    method: { type: "command", path: "Contents/SharedSupport/bin/subl" },
  },
  {
    id: "com.sublimetext.3",
    name: "Sublime Text 3",
    method: { type: "command", path: "Contents/SharedSupport/bin/subl" },
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
  { id: "com.apple.dt.Xcode", name: "Xcode", method: { type: "xed" } },
  { id: "com.barebones.bbedit", name: "BBEdit", method: { type: "openURL", scheme: "x-bbedit" } },
  { id: "com.macromates.TextMate", name: "TextMate", method: { type: "openURL", scheme: "txmt" } },
];

export interface InstalledEditor {
  editor: Editor;
  appPath: string;
}

/**
 * The editor code opens in: the one chosen in DigUp's settings when it's installed, else the first known one that
 * is. Null: each file's default app ("" in DigUp's settings, or no known editor installed).
 */
export function chooseEditor(
  setting: string | undefined,
  apps: { bundleId?: string; path: string }[],
): InstalledEditor | null {
  if (setting === "") return null;
  const installed = KNOWN_EDITORS.flatMap((editor) => {
    const app = apps.find((item) => item.bundleId === editor.id);
    return app ? [{ editor, appPath: app.path }] : [];
  });
  return installed.find((item) => item.editor.id === setting) ?? installed[0] ?? null;
}

export type EditorPlan =
  { type: "url"; url: string } | { type: "command"; program: string; args: string[]; appPath: string };

/** `executable`: a JetBrains IDE's launcher (its bundle's CFBundleExecutable). */
export function editorPlan(installed: InstalledEditor, file: string, line: number, executable?: string): EditorPlan {
  const { editor, appPath } = installed;
  switch (editor.method.type) {
    case "fileURL":
      // The path as a URL path: every part encoded, the slashes kept.
      return {
        type: "url",
        url: `${editor.method.scheme}://file${file.split("/").map(encodeURIComponent).join("/")}:${line}:1`,
      };
    case "openURL":
      return {
        type: "url",
        url: `${editor.method.scheme}://open?url=${encodeURIComponent(pathToFileURL(file).href)}&line=${line}`,
      };
    case "command":
      return { type: "command", program: join(appPath, editor.method.path), args: [`${file}:${line}`], appPath };
    case "xed":
      return {
        type: "command",
        program: join(appPath, "Contents/Developer/usr/bin/xed"),
        args: ["--line", String(line), file],
        appPath,
      };
    case "jetBrains":
      return {
        type: "command",
        program: join(appPath, "Contents/MacOS", executable ?? "idea"),
        args: ["--line", String(line), file],
        appPath,
      };
  }
}

/** The line a code result opens at: where the name is defined or the words are, else where its stretch starts. */
export function codeLine(hit: Hit): number {
  return hit.segment === "lines" ? Math.max(1, Math.trunc(hit.focus ?? hit.loc ?? 1)) : 1;
}
