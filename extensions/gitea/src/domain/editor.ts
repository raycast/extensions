import type { getApplications } from "@raycast/api";

export const EditorId = {
  VSCode: "vscode",
  Cursor: "cursor",
  Zed: "zed",
  IntelliJ: "intellij",
} as const;

export type EditorId = (typeof EditorId)[keyof typeof EditorId];

export type EditorInfo = {
  id: EditorId;
  name: string;
  icon: string;
  prefKey: keyof Preferences & string;
  bundleId: string;
  namePatterns: RegExp[];
  windowsPathPatterns?: RegExp[];
};

export type RaycastApplication = Awaited<ReturnType<typeof getApplications>>[number];

export const Editors = [
  {
    id: EditorId.VSCode,
    name: "VS Code",
    bundleId: "com.microsoft.VSCode",
    icon: "logo/vscode.png",
    prefKey: "editorVSCode",
    namePatterns: [/^visual studio code$/i, /^code$/i, /^vscode$/i],
    windowsPathPatterns: [/visual studio code\.lnk$/i, /code\.lnk$/i],
  },
  {
    id: EditorId.Cursor,
    name: "Cursor",
    bundleId: "com.todesktop.230313mzl4w4u92",
    icon: "logo/cursor.png",
    prefKey: "editorCursor",
    namePatterns: [/^cursor$/i],
    windowsPathPatterns: [/\/cursor\/cursor\.lnk$/i, /\/cursor\/cursor\.exe$/i],
  },
  {
    id: EditorId.Zed,
    name: "Zed",
    bundleId: "dev.zed.Zed",
    icon: "logo/zed.png",
    prefKey: "editorZed",
    namePatterns: [/^zed$/i, /^zed preview$/i],
    windowsPathPatterns: [
      /\/zed\/zed\.lnk$/i,
      /\/zed\/zed\.exe$/i,
      /\/zed preview\/zed\.lnk$/i,
      /\/zed preview\/zed\.exe$/i,
    ],
  },
  {
    id: EditorId.IntelliJ,
    name: "IntelliJ IDEA",
    bundleId: "com.jetbrains.intellij",
    icon: "logo/intellij.png",
    prefKey: "editorIntelliJ",
    namePatterns: [/^intellij idea$/i, /^idea$/i],
    windowsPathPatterns: [
      /\/jetbrains\/intellij idea.*\/bin\/idea64\.exe$/i,
      /\/jetbrains\/idea\/bin\/idea64\.exe$/i,
      /\/intellij idea.*\.lnk$/i,
    ],
  },
] as const satisfies readonly EditorInfo[];

const editorUrlSchemes = {
  [EditorId.VSCode]: (repoUrl: string) => `vscode://vscode.git/clone?url=${encodeURIComponent(repoUrl)}`,
  [EditorId.Cursor]: (repoUrl: string) => `cursor://vscode.git/clone?url=${encodeURIComponent(repoUrl)}`,
  [EditorId.Zed]: (repoUrl: string) => `zed://git/clone?repo=${encodeURIComponent(repoUrl)}`,
  [EditorId.IntelliJ]: (repoUrl: string) =>
    `jetbrains://idea/checkout/git?checkout.repo=${encodeURIComponent(repoUrl)}&idea.required.plugins.id=Git4Idea`,
} satisfies Record<EditorId, (repoUrl: string) => string>;

export function getEditorUrlScheme(editorId: EditorId, repoUrl: string): string {
  return editorUrlSchemes[editorId](repoUrl);
}

export function isEditorInstalled(editor: EditorInfo, apps: readonly RaycastApplication[]): boolean {
  if (process.platform === "win32") {
    return apps.some((app) => {
      const name = app.name ?? "";
      const localizedName = app.localizedName ?? "";
      const path = app.path ?? "";
      const normalizedPath = path.replace(/\\/g, "/");

      return (
        matchesAny(name, editor.namePatterns) ||
        matchesAny(localizedName, editor.namePatterns) ||
        matchesAny(normalizedPath, editor.windowsPathPatterns)
      );
    });
  }

  return apps.some((app) => {
    if (app.bundleId === editor.bundleId) return true;

    const name = app.name ?? "";
    const localizedName = app.localizedName ?? "";

    return matchesAny(name, editor.namePatterns) || matchesAny(localizedName, editor.namePatterns);
  });
}

function matchesAny(value: string, patterns?: readonly RegExp[]): boolean {
  return patterns?.some((pattern) => pattern.test(value)) ?? false;
}
