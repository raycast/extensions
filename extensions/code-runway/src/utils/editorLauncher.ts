import { Icon, environment } from "@raycast/api";
import { execFile } from "child_process";
import { existsSync, readdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { promisify } from "util";
import { EditorType, Project, WarpTemplate } from "../types";

const execFileAsync = promisify(execFile);

type EditorCandidate = {
  aliases: string[];
  family: string;
  order: number;
  title?: string;
  match: RegExp;
  lobeAsset?: string;
};

export type AvailableEditor = {
  bundleName: string;
  bundlePath: string;
  editorType: EditorType;
  family: string;
  title: string;
};

const EDITOR_CANDIDATES: EditorCandidate[] = [
  {
    aliases: ["cursor"],
    family: "cursor",
    order: 10,
    title: "Cursor",
    match: /^Cursor$/,
    lobeAsset: join(environment.assetsPath, "editor-cursor.svg"),
  },
  {
    aliases: ["vscode"],
    family: "vscode",
    order: 20,
    title: "Visual Studio Code",
    match: /^Visual Studio Code$/,
  },
  {
    aliases: ["vscode-insiders"],
    family: "vscode-insiders",
    order: 21,
    title: "Visual Studio Code - Insiders",
    match: /^Visual Studio Code - Insiders$/,
  },
  {
    aliases: ["vscodium"],
    family: "vscodium",
    order: 22,
    title: "VSCodium",
    match: /^VSCodium$/,
  },
  {
    aliases: ["zed"],
    family: "zed",
    order: 30,
    title: "Zed",
    match: /^Zed(?: Preview)?$/,
  },
  {
    aliases: ["windsurf"],
    family: "windsurf",
    order: 40,
    title: "Windsurf",
    match: /^Windsurf$/,
    lobeAsset: join(environment.assetsPath, "editor-windsurf.svg"),
  },
  {
    aliases: ["codex"],
    family: "codex",
    order: 45,
    title: "Codex",
    match: /^Codex$/,
  },
  {
    aliases: ["antigravity"],
    family: "antigravity",
    order: 50,
    title: "Antigravity",
    match: /^Antigravity$/,
    lobeAsset: join(environment.assetsPath, "editor-antigravity.svg"),
  },
  {
    aliases: ["sublime-text"],
    family: "sublime-text",
    order: 60,
    title: "Sublime Text",
    match: /^Sublime Text(?: \d+)?$/,
  },
  {
    aliases: ["nova"],
    family: "nova",
    order: 70,
    title: "Nova",
    match: /^Nova$/,
  },
  {
    aliases: ["fleet"],
    family: "fleet",
    order: 80,
    title: "Fleet",
    match: /^Fleet$/,
  },
  {
    aliases: ["textmate"],
    family: "textmate",
    order: 90,
    title: "TextMate",
    match: /^TextMate$/,
  },
  {
    aliases: ["android-studio"],
    family: "android-studio",
    order: 100,
    title: "Android Studio",
    match: /^Android Studio(?: Preview)?$/,
  },
  {
    aliases: ["xcode"],
    family: "xcode",
    order: 110,
    title: "Xcode",
    match: /^Xcode(?:[- ].+)?$/,
  },
  {
    aliases: ["intellij-idea"],
    family: "intellij-idea",
    order: 200,
    title: "IntelliJ IDEA",
    match: /^IntelliJ IDEA(?: .+)?$/,
  },
  {
    aliases: ["webstorm"],
    family: "webstorm",
    order: 210,
    title: "WebStorm",
    match: /^WebStorm(?: .+)?$/,
  },
  {
    aliases: ["pycharm"],
    family: "pycharm",
    order: 220,
    title: "PyCharm",
    match: /^PyCharm(?: .+)?$/,
  },
  {
    aliases: ["goland"],
    family: "goland",
    order: 230,
    title: "GoLand",
    match: /^GoLand(?: .+)?$/,
  },
  {
    aliases: ["datagrip"],
    family: "datagrip",
    order: 240,
    title: "DataGrip",
    match: /^DataGrip(?: .+)?$/,
  },
  {
    aliases: ["dataspell"],
    family: "dataspell",
    order: 250,
    title: "DataSpell",
    match: /^DataSpell(?: .+)?$/,
  },
  {
    aliases: ["phpstorm"],
    family: "phpstorm",
    order: 260,
    title: "PhpStorm",
    match: /^PhpStorm(?: .+)?$/,
  },
  {
    aliases: ["clion"],
    family: "clion",
    order: 270,
    title: "CLion",
    match: /^CLion(?: .+)?$/,
  },
  {
    aliases: ["rider"],
    family: "rider",
    order: 280,
    title: "Rider",
    match: /^Rider(?: .+)?$/,
  },
  {
    aliases: ["rubymine"],
    family: "rubymine",
    order: 290,
    title: "RubyMine",
    match: /^RubyMine(?: .+)?$/,
  },
  {
    aliases: ["rustrover"],
    family: "rustrover",
    order: 300,
    title: "RustRover",
    match: /^RustRover(?: .+)?$/,
  },
  {
    aliases: ["aqua"],
    family: "aqua",
    order: 310,
    title: "Aqua",
    match: /^Aqua(?: .+)?$/,
  },
];

let cachedEditors: AvailableEditor[] | null = null;

function getApplicationsDirectories(): string[] {
  return ["/Applications", join(homedir(), "Applications")].filter((dir) => existsSync(dir));
}

function stripAppExtension(bundleName: string): string {
  return bundleName.replace(/\.app$/i, "");
}

function prettifyEditorName(rawName: string): string {
  return rawName;
}

function findCandidate(bundleName: string): EditorCandidate | undefined {
  return EDITOR_CANDIDATES.find((candidate) => candidate.match.test(bundleName));
}

function scanInstalledEditors(): AvailableEditor[] {
  const editors = new Map<string, AvailableEditor>();

  for (const applicationsDir of getApplicationsDirectories()) {
    for (const entry of readdirSync(applicationsDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.endsWith(".app")) continue;

      const bundleName = stripAppExtension(entry.name);
      const candidate = findCandidate(bundleName);
      if (!candidate) continue;

      const bundlePath = join(applicationsDir, entry.name);
      const editor: AvailableEditor = {
        bundleName,
        bundlePath,
        editorType: bundleName,
        family: candidate.family,
        title: prettifyEditorName(bundleName),
      };

      if (!editors.has(editor.bundleName)) {
        editors.set(editor.bundleName, editor);
      }
    }
  }

  return [...editors.values()].sort((a, b) => {
    const candidateA = findCandidate(a.bundleName);
    const candidateB = findCandidate(b.bundleName);
    const orderA = candidateA?.order ?? 9999;
    const orderB = candidateB?.order ?? 9999;

    if (orderA !== orderB) return orderA - orderB;
    return a.title.localeCompare(b.title);
  });
}

function getInstalledEditors(): AvailableEditor[] {
  if (!cachedEditors) {
    cachedEditors = scanInstalledEditors();
  }

  return cachedEditors;
}

function resolveEditor(editorType?: EditorType): AvailableEditor | null {
  if (!editorType) return null;

  const editors = getInstalledEditors();
  const directMatch = editors.find((editor) => editor.editorType === editorType || editor.bundleName === editorType);
  if (directMatch) return directMatch;

  const normalized = editorType.toLowerCase();
  const candidate = EDITOR_CANDIDATES.find(
    (item) =>
      item.family === normalized || item.aliases.includes(normalized) || item.title?.toLowerCase() === normalized,
  );
  if (!candidate) return null;

  return editors.find((editor) => editor.family === candidate.family) ?? null;
}

function getFallbackEditorIcon(editorType?: EditorType): string | Icon {
  const normalized = editorType?.toLowerCase();
  const candidate = EDITOR_CANDIDATES.find(
    (item) =>
      item.family === normalized || item.aliases.includes(normalized || "") || item.title?.toLowerCase() === normalized,
  );

  return candidate?.lobeAsset || Icon.CodeBlock;
}

export function getAvailableEditors(selectedEditorType?: EditorType): AvailableEditor[] {
  const editors = getInstalledEditors();
  const selected = resolveEditor(selectedEditorType);

  if (!selected || editors.some((editor) => editor.editorType === selected.editorType)) {
    return editors;
  }

  return [selected, ...editors];
}

async function getApplicationPath(appName: string): Promise<string> {
  const script = `POSIX path of (path to application "${appName}")`;
  const { stdout } = await execFileAsync("osascript", ["-e", script]);
  return stdout.trim();
}

export function getEditorDisplayName(editorType?: EditorType): string {
  const editor = resolveEditor(editorType);
  if (editor) return editor.title;

  const normalized = editorType?.toLowerCase();
  const candidate = EDITOR_CANDIDATES.find(
    (item) =>
      item.family === normalized || item.aliases.includes(normalized || "") || item.title?.toLowerCase() === normalized,
  );

  return candidate?.title || editorType || "Editor";
}

export function getEditorIcon(editorType?: EditorType): string | Icon | { fileIcon: string } {
  const editor = resolveEditor(editorType);
  if (editor) {
    return { fileIcon: editor.bundlePath };
  }

  return getFallbackEditorIcon(editorType);
}

export async function checkEditorInstalled(editorType?: EditorType): Promise<boolean> {
  if (!editorType) return false;
  if (resolveEditor(editorType)) return true;

  const title = getEditorDisplayName(editorType);
  try {
    await getApplicationPath(title);
    return true;
  } catch {
    return false;
  }
}

export async function launchEditorProject(project: Project, template: WarpTemplate): Promise<void> {
  const editor = resolveEditor(template.editorType);
  if (!editor) {
    throw new Error(`Editor not found: ${getEditorDisplayName(template.editorType)}`);
  }

  await execFileAsync("open", ["-a", editor.bundlePath, project.path]);
}
