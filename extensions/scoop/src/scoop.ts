import { exec, ExecException } from "child_process";
import { promisify } from "util";

const execp = promisify(exec);

const stripAnsi = (str: string): string => {
  return str.replace(
    // eslint-disable-next-line no-control-regex
    /[\u001b\u009b][[()#;?]*.{0,2}(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    "",
  );
};

const parseScoopTable = <T>(stdout: string, lineParser: (parts: string[]) => T): T[] => {
  const lines = stripAnsi(stdout).trim().split("\n");
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
};

export interface ScoopPackage {
  Name: string;
  Version: string;
  Source: string;
  Binaries: string;
}

export interface InstalledScoopPackage {
  Name: string;
  Version: string;
  Source: string;
  Info: string;
}

export interface OutdatedScoopPackage {
  Name: string;
  Current: string;
  Latest: string;
}

// Represents the direct JSON output from 'scoop cat'
export interface ScoopManifest {
  version: string;
  description?: string;
  homepage?: string;
  license?: string | { identifier: string; url: string };
  notes?: string | string[];
  bin?: string | string[];
}

// A more generalized interface for our UI components
export interface ScoopPackageDetails {
  Name: string;
  Version: string;
  Description?: string;
  Homepage?: string;
  License?: string;
  Notes?: string;
  Binaries?: string;
}

export interface ScoopBucket {
  Name: string;
  Source: string;
  Updated: string;
  Manifests: string;
}

export async function scoopSearch(query: string): Promise<ScoopPackage[]> {
  try {
    const { stdout } = await execp(`scoop search ${query}`);
    return parseScoopTable(stdout, (parts) => ({
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

export async function scoopList(): Promise<InstalledScoopPackage[]> {
  try {
    const { stdout } = await execp("scoop export");
    const exportedData = JSON.parse(stdout);
    return exportedData.apps as InstalledScoopPackage[];
  } catch (error) {
    console.error("Error listing installed scoop packages:", error);
    return [];
  }
}

export async function scoopStatus(): Promise<OutdatedScoopPackage[]> {
  try {
    const { stdout } = await execp("scoop status");
    const lines = stripAnsi(stdout).trim().split("\n");

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

export async function scoopCat(packageName: string): Promise<ScoopPackageDetails> {
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

export async function scoopInstall(packageName: string): Promise<void> {
  await execp(`scoop install ${packageName}`);
}

export async function scoopUpdate(packageName: string): Promise<void> {
  await execp(`scoop update ${packageName}`);
}

export async function scoopUninstall(packageName: string): Promise<void> {
  await execp(`scoop uninstall ${packageName}`);
}

export async function scoopBucketList(): Promise<ScoopBucket[]> {
  try {
    const { stdout } = await execp("scoop bucket list");
    const lines = stripAnsi(stdout).trim().split("\n");

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

export async function scoopBucketAdd(bucketName: string): Promise<void> {
  await execp(`scoop bucket add ${bucketName}`);
}

export async function scoopBucketRm(bucketName: string): Promise<void> {
  await execp(`scoop bucket rm ${bucketName}`);
}
