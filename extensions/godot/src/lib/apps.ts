import { GODOT3_CONFIG_VERSION, GODOT4_CONFIG_VERSION, GodotProject } from "./projects";

export const GODOT_BUNDLE_ID = "org.godotengine.godot";

export interface GodotApp {
  path: string;
  name: string;
  /** CFBundleShortVersionString, for example "4.3". */
  version?: string;
  /** The .NET build ships GodotSharp inside the app bundle. */
  isDotnet: boolean;
}

export type ProjectInfo = Pick<GodotProject, "name" | "configVersion" | "engineVersion" | "isCSharp">;

/** Reads the top-level string values of an XML property list. */
export function parsePlistStrings(xml: string): Record<string, string> {
  const values: Record<string, string> = {};
  const pattern = /<key>([^<]*)<\/key>\s*<string>([^<]*)<\/string>/g;
  for (const match of xml.matchAll(pattern)) {
    values[decodeXml(match[1])] = decodeXml(match[2]);
  }
  return values;
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/** "4.3.1" → [4, 3, 1], "3.x" → [3]. */
export function parseVersion(version: string | undefined): number[] | undefined {
  if (!version) return undefined;
  const parts: number[] = [];
  for (const part of version.split(".")) {
    if (!/^\d+$/.test(part)) break;
    parts.push(Number(part));
  }
  return parts.length > 0 ? parts : undefined;
}

export function compareVersions(a: string | undefined, b: string | undefined): number {
  const left = parseVersion(a) ?? [];
  const right = parseVersion(b) ?? [];
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

/** True when the app is the same release as the project: same major.minor, or same major for "3.x". */
export function isSameRelease(appVersion: string | undefined, projectVersion: string | undefined): boolean {
  const app = parseVersion(appVersion);
  const project = parseVersion(projectVersion);
  if (!app || !project) return false;
  const length = Math.min(project.length, 2);
  return project.slice(0, length).every((part, index) => app[index] === part);
}

/**
 * Picks the app for a project: .NET builds for C# projects (when one is installed), then the
 * build that matches the project's Godot version, then the newest version.
 * Without a project it picks the newest standard build.
 */
export function chooseApp(apps: GodotApp[], project?: ProjectInfo): GodotApp | undefined {
  const wantsDotnet = project?.isCSharp === true;
  let pool = apps;
  if (wantsDotnet && apps.some((app) => app.isDotnet)) pool = apps.filter((app) => app.isDotnet);
  const matching = pool.filter((app) => isSameRelease(app.version, project?.engineVersion));
  if (matching.length > 0) pool = matching;

  return [...pool].sort((a, b) => {
    const byVersion = compareVersions(b.version, a.version);
    if (byVersion !== 0) return byVersion;
    if (a.isDotnet !== b.isDotnet) return a.isDotnet === wantsDotnet ? -1 : 1;
    return a.path.localeCompare(b.path);
  })[0];
}

export function describeApp(app: GodotApp): string {
  if (!app.version) return app.name;
  return `Godot ${app.version}${app.isDotnet ? " (.NET)" : ""}`;
}

function getAppConfigVersion(app: GodotApp): number | undefined {
  const major = parseVersion(app.version)?.[0];
  if (major === undefined) return undefined;
  return major >= 4 ? GODOT4_CONFIG_VERSION : GODOT3_CONFIG_VERSION;
}

function describeMaker(configVersion: number): string {
  return configVersion === GODOT3_CONFIG_VERSION ? "Godot 3" : "an older version of Godot";
}

/** Why the app can't run the project: Godot only runs projects in its own settings format. */
export function getRunProblem(project: ProjectInfo, app: GodotApp): string | undefined {
  const appConfigVersion = getAppConfigVersion(app);
  if (appConfigVersion === undefined || project.configVersion === appConfigVersion) return undefined;
  if (project.configVersion < appConfigVersion) {
    return `This project was made with ${describeMaker(project.configVersion)}, so ${describeApp(app)} can't run it. Open it in the editor to convert it first.`;
  }
  return `This project was made with a newer version of Godot, so ${describeApp(app)} can't run it.`;
}

/**
 * Warnings shown before opening a project in the editor. They match the checks the
 * Project Manager runs in ProjectManager::_open_selected_projects_check_warnings(),
 * which are skipped when a project is opened from the command line.
 */
export function getOpenWarnings(project: ProjectInfo, app: GodotApp): string[] {
  const warnings: string[] = [];
  const appConfigVersion = getAppConfigVersion(app);

  if (appConfigVersion !== undefined) {
    if (project.configVersion < appConfigVersion) {
      warnings.push(
        `This project was made with ${describeMaker(project.configVersion)}. ${describeApp(app)} will convert it, and older versions of Godot can't open it after that.`,
      );
    } else if (project.configVersion > appConfigVersion) {
      warnings.push(
        `This project was made with a newer version of Godot than ${describeApp(app)}, so it may not open.`,
      );
    } else if (project.engineVersion && !isSameRelease(app.version, project.engineVersion)) {
      const newer = compareVersions(project.engineVersion, app.version) > 0;
      warnings.push(
        newer
          ? `This project was last edited in Godot ${project.engineVersion}, which is newer than ${describeApp(app)}. It may not open correctly.`
          : `This project was last edited in Godot ${project.engineVersion}. Opening it in ${describeApp(app)} updates it to that version.`,
      );
    }
  }

  if (project.isCSharp && !app.isDotnet) {
    warnings.push(`This project uses C#, but ${describeApp(app)} is not the .NET build, so C# scripts won't work.`);
  }

  return warnings;
}
