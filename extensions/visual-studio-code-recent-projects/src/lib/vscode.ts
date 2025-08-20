import { getPreferenceValues } from "@raycast/api";
import * as child_process from "child_process";
import * as afs from "fs/promises";
import * as os from "os";
import path from "path";
import { fileExists, isWin, isMacOs } from "../utils";
import { runPowerShellScript } from "@raycast/utils";

interface ExtensionMetaRoot {
  identifier: ExtensionIdentifier;
  version: string;
  location: ExtensionLocation | string;
  metadata?: ExtensionMetadata;
}

interface ExtensionIdentifier {
  id: string;
  uuid: string;
}

interface ExtensionLocation {
  $mid: number;
  fsPath: string;
  path: string;
  scheme: string;
}

interface ExtensionMetadata {
  id: string;
  publisherId?: string;
  publisherDisplayName?: string;
  targetPlatform?: string;
  isApplicationScoped?: boolean;
  updated?: boolean;
  isPreReleaseVersion: boolean;
  installedTimestamp?: number;
  preRelease?: boolean;
}

export interface Extension {
  id: string;
  name: string;
  version: string;
  preRelease?: boolean;
  icon?: string;
  updated?: boolean;
  fsPath: string;
  publisherId?: string;
  publisherDisplayName?: string;
  preview?: boolean;
  installedTimestamp?: number;
}

interface PackageJSONInfo {
  displayName?: string;
  icon?: string;
  preview?: boolean;
}

function getNLSVariable(text: string | undefined): string | undefined {
  if (!text) {
    return text;
  }
  const m = text.match(/%(.+)%/);
  if (m) {
    return m[1];
  }
}

function cliPaths(): Record<string, string> {
  let cliPaths: Record<string, string> = {};

  if (isWin) {
    const programsFolder = path.join(os.homedir(), "AppData", "Local", "Programs");
    cliPaths = {
      Code: path.join(programsFolder, "Microsoft VS Code", "bin", "code.cmd"),
      "Code - Insiders": path.join(programsFolder, "Microsoft VS Code Insiders", "bin", "code-insiders.cmd"),
      Kiro: path.join(programsFolder, "Kiro", "bin", "kiro.cmd"),
      Cursor: path.join(programsFolder, "cursor", "resources", "app", "bin", "cursor.cmd"),
      Positron: path.join(programsFolder, "Positron", "bin", "positron.cmd"),
      Trae: path.join(programsFolder, "Trae", "bin", "trae.cmd"),
      "Trae CN": path.join(programsFolder, "Trae CN", "bin", "trae-cn.cmd"),
      VSCodium: path.join(programsFolder, "VSCodium", "bin", "codium.cmd"),
      "VSCodium - Insiders": path.join(programsFolder, "VSCodium Insiders", "bin", "codium-insiders.cmd"),
      Windsurf: path.join(programsFolder, "Windsurf", "bin", "windsurf.cmd"),
    };
  }

  if (isMacOs) {
    cliPaths = {
      Code: "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
      "Code - Insiders": "/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code",
      Cursor: "/Applications/Cursor.app/Contents/Resources/app/bin/cursor", // it also has code, which is an alias
      Kiro: "/Applications/Kiro.app/Contents/Resources/app/bin/kiro",
      Positron: "/Applications/Positron.app/Contents/Resources/app/bin/code",
      Trae: "/Applications/Trae.app/Contents/Resources/app/bin/marscode",
      "Trae CN": "/Applications/Trae CN.app/Contents/Resources/app/bin/marscode",
      VSCodium: "/Applications/VSCodium.app/Contents/Resources/app/bin/codium",
      "VSCodium - Insiders": "/Applications/VSCodium - Insiders.app/Contents/Resources/app/bin/codium-insiders",
      Windsurf: "/Applications/Windsurf.app/Contents/Resources/app/bin/windsurf",
    };
  }

  return cliPaths;
}

export function getVSCodeCLIFilename(): string {
  const paths: Record<string, string> = cliPaths();

  const name = paths[getBuildNamePreference()];
  if (!name || name.length <= 0) {
    return paths.Code;
  }
  return name;
}

// https://code.visualstudio.com/docs/configure/command-line#_core-cli-options
export class VSCodeCLI {
  private cliFilename: string;
  constructor(cliFilename: string) {
    this.cliFilename = cliFilename;
  }

  async installExtensionByID(id: string) {
    if (isWin) {
      await runPowerShellScript(`
        Start-Process -FilePath "${this.cliFilename}" -ArgumentList "--install-extension ${id}", "--force" -WindowStyle Hidden
      `);
    } else {
      child_process.execFileSync(this.cliFilename, ["--install-extension", id, "--force"]);
    }
  }

  async uninstallExtensionByID(id: string) {
    if (isWin) {
      await runPowerShellScript(`
        Start-Process -FilePath "${this.cliFilename}" -ArgumentList "--uninstall-extension ${id}", "--force" -WindowStyle Hidden
      `);
    } else {
      child_process.execFileSync(this.cliFilename, ["--uninstall-extension", id, "--force"]);
    }
  }

  async newWindow() {
    if (isWin) {
      await runPowerShellScript(`
        Start-Process -FilePath "${this.cliFilename}" -ArgumentList "--new-window" -WindowStyle Hidden
      `);
    } else {
      child_process.execFileSync(this.cliFilename, ["--new-window"]);
    }
  }
}

export function getVSCodeCLI(): VSCodeCLI {
  return new VSCodeCLI(getVSCodeCLIFilename());
}

async function getPackageJSONInfo(filename: string): Promise<PackageJSONInfo | undefined> {
  try {
    if (await fileExists(filename)) {
      const packageJSONData = await afs.readFile(filename, { encoding: "utf-8" });
      const packageJSON = JSON.parse(packageJSONData);
      let displayName = packageJSON.displayName as string | undefined;
      const nlsVariable = getNLSVariable(displayName);
      const iconFilename = packageJSON.icon as string | undefined;
      const folder = path.dirname(filename);
      if (nlsVariable && nlsVariable.length > 0) {
        const nlsFilename = path.join(folder, "package.nls.json");
        try {
          if (await fileExists(nlsFilename)) {
            const nlsContent = await afs.readFile(nlsFilename, { encoding: "utf-8" });
            const nlsJSON = JSON.parse(nlsContent);
            const displayNameNLS = nlsJSON[nlsVariable] as string | undefined;
            if (displayNameNLS && displayNameNLS.length > 0) {
              displayName = displayNameNLS;
            }
          }
        } catch (error) {
          // ignore
        }
      }
      const preview = packageJSON.preview as boolean | undefined;
      const icon = iconFilename ? path.join(folder, iconFilename) : undefined;
      return {
        displayName,
        icon,
        preview,
      };
    }
  } catch (error) {
    //
  }
  return undefined;
}

export async function getLocalExtensions(): Promise<Extension[] | undefined> {
  const extensionsRootFolder = path.join(os.homedir(), `.${getBuildScheme()}/extensions`);
  const extensionsManifrestFilename = path.join(extensionsRootFolder, "extensions.json");
  if (await fileExists(extensionsManifrestFilename)) {
    const data = await afs.readFile(extensionsManifrestFilename, { encoding: "utf-8" });
    const extensions = JSON.parse(data) as ExtensionMetaRoot[] | undefined;
    if (extensions && extensions.length > 0) {
      const result: Extension[] = [];
      for (const e of extensions) {
        let extFsPath =
          typeof e.location === "string"
            ? path.join(extensionsRootFolder, e.location)
            : e.location.fsPath ?? e.location.path;

        if (isWin && extFsPath.startsWith("/")) extFsPath = extFsPath.slice(1);

        const packageFilename = path.join(extFsPath, "package.json");
        const pkgInfo = await getPackageJSONInfo(packageFilename);
        result.push({
          id: e.identifier.id,
          name: pkgInfo?.displayName || e.identifier.id,
          version: e.version,
          preRelease: e.metadata?.preRelease,
          icon: pkgInfo?.icon,
          updated: e.metadata?.updated,
          fsPath: extFsPath,
          publisherId: e.metadata?.publisherId,
          publisherDisplayName: e.metadata?.publisherDisplayName,
          preview: pkgInfo?.preview,
          installedTimestamp: e.metadata?.installedTimestamp,
        });
      }
      return result;
    }
  }
  return undefined;
}

export function getBuildNamePreference(): string {
  const prefs = getPreferenceValues();
  const build = prefs.build as string;
  return build;
}

const buildSchemes: Record<string, string> = {
  Code: "vscode",
  "Code - Insiders": "vscode-insiders",
  Cursor: "cursor",
  Kiro: "kiro",
  VSCodium: "vscode-oss",
  Positron: "positron",
  Windsurf: "windsurf",
  Trae: "trae",
  "Trae CN": "trae-cn",
};

export function getBuildScheme(): string {
  const scheme = buildSchemes[getBuildNamePreference()] as string | undefined;
  if (!scheme || scheme.length <= 0) {
    return buildSchemes.Code;
  }
  return scheme;
}
