import type { EditorType } from "../types/preferences.ts";

/** Where an editor should land: absolute file path plus a 1-based position. */
export interface EditorPosition {
  filePath: string;
  line: number;
  column: number;
}

/**
 * How to launch an editor at a position. `url` editors use their URL scheme;
 * `cli` editors run an executable that lives inside the app bundle, so the
 * caller resolves the installed app first and joins `relativeExecutable` onto
 * its path. Args are always separate argv entries — never shell strings.
 */
export type EditorLaunch = { kind: "url"; url: string } | { kind: "cli"; relativeExecutable: string; args: string[] };

export const EDITOR_TITLES: Record<EditorType, string> = {
  vscode: "Visual Studio Code",
  cursor: "Cursor",
  zed: "Zed",
  sublime: "Sublime Text",
  rider: "JetBrains Rider",
};

/** Used to find the installed app; first match wins. */
export const EDITOR_BUNDLE_IDS: Record<EditorType, string[]> = {
  vscode: ["com.microsoft.VSCode"],
  cursor: ["com.todesktop.230313mzl4w4u92"],
  zed: ["dev.zed.Zed", "dev.zed.Zed-Preview"],
  sublime: ["com.sublimetext.4", "com.sublimetext.3"],
  rider: ["com.jetbrains.rider"],
};

function position(value: number): number {
  return Number.isFinite(value) && value >= 1 ? Math.trunc(value) : 1;
}

/**
 * Percent-encodes every path segment (including `:`) so a hostile file name
 * cannot break the trailing `:line:column` parsing; slashes stay raw.
 */
function encodedPath(filePath: string): string {
  return filePath.split("/").map(encodeURIComponent).join("/");
}

export function editorLaunch(editor: EditorType, target: EditorPosition): EditorLaunch {
  const line = position(target.line);
  const column = position(target.column);
  switch (editor) {
    case "vscode":
      return { kind: "url", url: `vscode://file${encodedPath(target.filePath)}:${line}:${column}` };
    case "cursor":
      return { kind: "url", url: `cursor://file${encodedPath(target.filePath)}:${line}:${column}` };
    case "zed":
      return { kind: "url", url: `zed://file${encodedPath(target.filePath)}:${line}:${column}` };
    case "sublime":
      return {
        kind: "cli",
        relativeExecutable: "Contents/SharedSupport/bin/subl",
        args: [`${target.filePath}:${line}:${column}`],
      };
    case "rider":
      // ponytail: --line only; JetBrains' --column support varies by version.
      return {
        kind: "cli",
        relativeExecutable: "Contents/MacOS/rider",
        args: ["--line", String(line), target.filePath],
      };
  }
}
