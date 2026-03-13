import { exec } from "node:child_process";
import type { ExecException } from "node:child_process";
import { promisify } from "node:util";
import {
  ScoopPackage,
  ScoopManifest,
  InstalledScoopPackage,
  OutdatedScoopPackage,
  ScoopBucket,
} from "./types/index.types";

export const execp = promisify(exec);

export class ScoopManager {
  private static instance: ScoopManager;

  private stripAnsi(str: string): string {
    return str.replace(
      // eslint-disable-next-line no-control-regex
      /[\u001b\u009b][[()#;?]*.{0,2}(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      "",
    );
  }

  private parseScoopTable<T>(stdout: string, lineParser: (parts: string[]) => T): T[] {
    const lines = this.stripAnsi(stdout).trim().split("\n");
    const separatorIndex = lines.findIndex((line) => line.trim().startsWith("----"));

    if (separatorIndex === -1) {
      return [];
    }

    return lines
      .slice(separatorIndex + 1)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const parts = line.split(/\s{2,}/);
        return lineParser(parts);
      });
  }

  public static getInstance() {
    if (!ScoopManager.instance) {
      ScoopManager.instance = new ScoopManager();
    }
    return ScoopManager.instance;
  }

  public async search(query: string): Promise<ScoopPackage[]> {
    try {
      const { stdout } = await execp(`scoop search ${query}`);
      return this.parseScoopTable(stdout, (parts) => ({
        Name: parts[0],
        Version: parts[1],
        Source: parts[2],
        Binaries: parts[3] || "",
      }));
    } catch (e) {
      const error = e as ExecException & { stdout: string; stderr: string };
      if (error.stdout?.includes("Couldn't find any packages")) {
        return [];
      }
      console.error("Error searching for scoop packages:", error);
      return [];
    }
  }

  public async listInstalled(): Promise<InstalledScoopPackage[]> {
    try {
      const { stdout } = await execp("scoop export");
      const exportedData = JSON.parse(stdout);
      return exportedData.apps as InstalledScoopPackage[];
    } catch (error) {
      console.error("Error listing installed scoop packages:", error);
      return [];
    }
  }

  public async status(): Promise<OutdatedScoopPackage[]> {
    try {
      const { stdout } = await execp("scoop status");
      const lines = this.stripAnsi(stdout).trim().split("\n");

      const headerIndex = lines.findIndex((line) => line.includes("Name") && line.includes("Installed Version"));
      if (headerIndex === -1) {
        if (stdout.includes("Scoop is up to date")) {
          return [];
        }
        return [];
      }

      const headerLine = lines[headerIndex];
      const dataLines = lines.slice(headerIndex + 2); // Skips header and '----' line

      const nameEnd = headerLine.indexOf("Installed Version");
      const installedEnd = headerLine.indexOf("Latest Version");
      const latestEnd = headerLine.indexOf("Missing Dependencies");

      const outdatedPackages = dataLines
        .map((line) => {
          if (line.trim() === "") return null;
          const name = line.substring(0, nameEnd).trim();
          const current = line.substring(nameEnd, installedEnd).trim();
          const latest = line.substring(installedEnd, latestEnd).trim();

          return {
            Name: name,
            Current: current,
            Latest: latest,
          };
        })
        .filter((p): p is OutdatedScoopPackage => p !== null && p.Name !== "");

      return outdatedPackages;
    } catch (error) {
      console.error("Error checking scoop status:", error);
      return [];
    }
  }

  public async cat(packageName: string) {
    try {
      const { stdout } = await execp(`scoop cat ${packageName}`);
      const manifest: ScoopManifest = JSON.parse(stdout);

      const formatArray = (arr?: string | string[]): string | undefined => {
        if (Array.isArray(arr)) return arr.join("\n");
        return arr;
      };

      return {
        Name: packageName,
        Version: manifest.version,
        Description: manifest.description,
        Homepage: manifest.homepage,
        License: typeof manifest.license === "string" ? manifest.license : manifest.license?.identifier,
        Notes: formatArray(manifest.notes),
        Binaries: formatArray(manifest.bin),
      };
    } catch (error) {
      console.error(`Error getting cat for ${packageName}:`, error);
      return { Name: packageName, Version: "Unknown" };
    }
  }

  public async cleanup(packageName: string): Promise<void> {
    await execp(`scoop cleanup ${packageName}`);
  }

  public async install(packageName: string): Promise<void> {
    await execp(`scoop install ${packageName}`);
  }

  public async update(packageName: string): Promise<void> {
    await execp(`scoop update ${packageName}`);
  }

  public async uninstall(packageName: string): Promise<void> {
    await execp(`scoop uninstall ${packageName}`);
  }

  public async listBuckets() {
    try {
      const { stdout } = await execp("scoop bucket list");
      const lines = this.stripAnsi(stdout).trim().split("\n");

      const headerIndex = lines.findIndex((line) => line.includes("Name") && line.includes("Source"));
      if (headerIndex === -1) return [];

      const headerLine = lines[headerIndex];
      const dataLines = lines.slice(headerIndex + 2);

      const nameEnd = headerLine.indexOf("Source");
      const sourceEnd = headerLine.indexOf("Updated");
      const updatedEnd = headerLine.indexOf("Manifests");

      return dataLines
        .map((line) => {
          if (line.trim() === "") return null;
          const name = line.substring(0, nameEnd).trim();
          const source = line.substring(nameEnd, sourceEnd).trim();
          const updated = line.substring(sourceEnd, updatedEnd).trim();
          const manifests = line.substring(updatedEnd).trim();

          return { Name: name, Source: source, Updated: updated, Manifests: manifests };
        })
        .filter((b): b is ScoopBucket => b !== null && b.Name !== "");
    } catch (error) {
      console.error("Error listing scoop buckets:", error);
      return [];
    }
  }
  public async bucketAdd(bucketName: string): Promise<void> {
    await execp(`scoop bucket add ${bucketName}`);
  }

  public async bucketRemove(bucketName: string): Promise<void> {
    await execp(`scoop bucket rm ${bucketName}`);
  }
}
