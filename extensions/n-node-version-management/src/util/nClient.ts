import { spawnSync } from "node:child_process";
import { preferences } from "./preferences";
import * as os from "os";
import { execAsync } from "./execAsync";

export enum VersionSource {
  Local = "local",
  Network = "network",
}

export type Versions = { [key: string]: VersionInformation };

export type VersionInformation = { version: string; type: VersionSource };

class NClient {
  public readonly isInstalled: boolean;
  private readonly nPath: string;
  private readonly nDirectory: string;

  constructor(nPath: string, nDirectory: string) {
    console.log(`NClient constructor called with nPath ${nPath} and nDirectory ${nDirectory}.`);

    this.nDirectory = nDirectory;
    this.nPath = nPath;

    this.isInstalled = this.isNInstalled();
  }

  async getLocalVersions(): Promise<Versions> {
    const { stdout, stderr } = await execAsync(`${this.nPath} ls`);

    if (stdout.toString().length == 0) {
      console.log("No local versions found.xxx");
      return {};
    }

    const localVersions = stdout
      .toString()
      .trim()
      .replaceAll("node/", "")
      .split(os.EOL)
      .reverse()
      .map((version): VersionInformation => {
        return { version, type: VersionSource.Local };
      })
      .reduce((acc: Versions, version) => {
        acc[version.version] = version;
        return acc;
      }, {});

    console.log(`getLocalVersions: ${JSON.stringify(localVersions)};; stdout: ${stdout};; stderr: ${stderr}`);

    return localVersions;
  }

  async activateOrDownloadVersion(version: string): Promise<boolean> {
    const { stdout, stderr } = await execAsync(`${this.nPath} ${version}`);

    console.log(`setActiveVersion: stdout: ${stdout};; stderr: ${stderr}`);

    if (stderr.length === 0) {
      return true;
    } else if (stderr == "tar: Failed to set default locale\n") {
      return true;
    } else {
      return false;
    }
  }

  async getActiveVersion(): Promise<string | undefined> {
    const nodeExecutable = `${this.nDirectory}/bin/node`;
    const { stdout, stderr } = await execAsync(`${nodeExecutable} --version`);

    if (stderr.length === 0) {
      // vXX.YY.ZZ\n
      const activeVersion = stdout.toString().replace("v", "").trim();
      console.log(`getActiveVersion: ${activeVersion}`);
      return activeVersion;
    } else {
      console.error("Could not get active version");
    }
  }

  private isNInstalled() {
    const { stdout, stderr } = spawnSync(`${this.nPath} --version`, { shell: true });

    if (stdout.length === 0) {
      console.error(`n is not installed: ${stderr}`);
      return false;
    }

    console.log(`n is installed: ${stdout}`);
    return true;
  }

  async deleteVersion(version: string): Promise<boolean> {
    const { stdout, stderr } = await execAsync(`${this.nPath} rm ${version}`);

    console.log(`deleteVersion: stdout: ${stdout};; stderr: ${stderr}`);

    return stderr.length === 0;
  }

  async getAvailableVersions(): Promise<Versions> {
    const { stdout, stderr } = await execAsync(`${this.nPath} lsr --all`);
    console.log(`getAvailableVersions: stdout: ${stdout};; stderr: ${stderr}`);

    return stdout
      .trim()
      .split(os.EOL)
      .map((version): VersionInformation => {
        return { version, type: VersionSource.Network };
      })
      .reduce((acc: Versions, version) => {
        acc[version.version] = version;
        return acc;
      }, {});
  }
}

const nClient = new NClient(preferences.path, preferences.directory);

export { nClient };
