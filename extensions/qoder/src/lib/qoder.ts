import { fileExists } from "./utils";
import * as afs from "fs/promises";
import * as os from "os";
import path from "path";
import * as child_process from "child_process";
import { promisify } from "util";

const execFile = promisify(child_process.execFile);

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

export async function getQoderCLIFilename(): Promise<string> {
  const possiblePaths = [
    "/Applications/Qoder.app/Contents/Resources/app/bin/qoder",
    path.join(os.homedir(), "Applications/Qoder.app/Contents/Resources/app/bin/qoder"),
    "/usr/local/bin/qoder",
    "/opt/Qoder/bin/qoder",
  ];

  for (const cliPath of possiblePaths) {
    if (await fileExists(cliPath)) {
      return cliPath;
    }
  }

  throw new Error("Qoder CLI not found. Please ensure Qoder is installed in /Applications or add qoder to your PATH.");
}

export class QoderCLI {
  private cliFilename: string;
  constructor(cliFilename: string) {
    this.cliFilename = cliFilename;
  }
  async installExtensionByID(id: string): Promise<void> {
    try {
      await execFile(this.cliFilename, ["--install-extension", id, "--force"]);
    } catch (error) {
      throw new Error(`Failed to install extension ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async uninstallExtensionByID(id: string): Promise<void> {
    try {
      await execFile(this.cliFilename, ["--uninstall-extension", id, "--force"]);
    } catch (error) {
      throw new Error(`Failed to uninstall extension ${id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export async function getQoderCLI(): Promise<QoderCLI> {
  const cliFilename = await getQoderCLIFilename();
  return new QoderCLI(cliFilename);
}

async function getPackageJSONInfo(filename: string): Promise<PackageJSONInfo | undefined> {
  try {
    if (await fileExists(filename)) {
      const packageJSONData = await afs.readFile(filename, {
        encoding: "utf-8",
      });
      const packageJSON = JSON.parse(packageJSONData);
      let displayName = packageJSON.displayName as string | undefined;
      const nlsVariable = getNLSVariable(displayName);
      const iconFilename = packageJSON.icon as string | undefined;
      const folder = path.dirname(filename);
      if (nlsVariable && nlsVariable.length > 0) {
        const nlsFilename = path.join(folder, "package.nls.json");
        try {
          if (await fileExists(nlsFilename)) {
            const nlsContent = await afs.readFile(nlsFilename, {
              encoding: "utf-8",
            });
            const nlsJSON = JSON.parse(nlsContent);
            const displayNameNLS = nlsJSON[nlsVariable] as string | undefined;
            if (displayNameNLS && displayNameNLS.length > 0) {
              displayName = displayNameNLS;
            }
          }
        } catch {
          // Ignore NLS file read errors
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
  } catch {
    // Ignore package.json read errors
  }
}

export async function getLocalExtensions(): Promise<Extension[] | undefined> {
  const extensionsRootFolder = path.join(os.homedir(), ".qoder/extensions");
  const extensionsManifestFilename = path.join(extensionsRootFolder, "extensions.json");
  if (await fileExists(extensionsManifestFilename)) {
    const data = await afs.readFile(extensionsManifestFilename, {
      encoding: "utf-8",
    });
    const extensions = JSON.parse(data) as ExtensionMetaRoot[] | undefined;
    if (extensions && extensions.length > 0) {
      const result: Extension[] = [];
      for (const e of extensions) {
        const extFsPath =
          typeof e.location === "string"
            ? path.join(extensionsRootFolder, e.location)
            : (e.location.fsPath ?? e.location.path);
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
