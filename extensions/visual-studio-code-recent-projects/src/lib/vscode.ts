import { fileExists } from "../utils";
import * as afs from "fs/promises";
import * as os from "os";
import path from "path";
import * as child_process from "child_process";
import { getPreferenceValues } from "@raycast/api";

interface ExtensionMetaRoot {
  identifier: ExtensionIdentifier;
  version: string;
  location: ExtensionLocation | string;
  metadata: ExtensionMetadata;
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
  publisherId: string;
  publisherDisplayName: string;
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
  publisherId: string;
  publisherDisplayName: string;
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

export function getVSCodeCLIFilename(): string {
  return `/Applications/${getBuildAppName()}.app/Contents/Resources/app/bin/code`;
}

export class VSCodeCLI {
  private cliFilename: string;
  constructor(cliFilename: string) {
    this.cliFilename = cliFilename;
  }
  installExtensionByIDSync(id: string) {
    child_process.execFileSync(this.cliFilename, ["--install-extension", id, "--force"]);
  }
  uninstallExtensionByIDSync(id: string) {
    child_process.execFileSync(this.cliFilename, ["--uninstall-extension", id, "--force"]);
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
        const extFsPath =
          typeof e.location === "string"
            ? path.join(extensionsRootFolder, e.location)
            : e.location.fsPath ?? e.location.path;
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
          publisherId: e.metadata.publisherId,
          publisherDisplayName: e.metadata.publisherDisplayName,
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
};

export function getBuildScheme(): string {
  const scheme = buildSchemes[getBuildNamePreference()] as string | undefined;
  if (!scheme || scheme.length <= 0) {
    return buildSchemes.Code;
  }
  return scheme;
}

const buildAppNames: Record<string, string> = {
  Code: "Visual Studio Code",
  "Code - Insiders": "Visual Studio Code - Insiders",
};

function getBuildAppName(): string {
  const name = buildAppNames[getBuildNamePreference()];
  if (!name || name.length <= 0) {
    return buildAppNames.Code;
  }
  return name;
}
