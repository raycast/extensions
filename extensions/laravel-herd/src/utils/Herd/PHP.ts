import { withCache } from "@raycast/utils";
import { PHPVersion } from "../../lib/types/phpVersion";
import { Herd } from "../Herd";
import { convertBooleanValue } from "../convertBooleanValue";

export class PHP {
  private static getPHPVersions = withCache(PHP.fetchPHPVersions, {
    maxAge: 60 * 60 * 1000,
  });

  static clearCache() {
    this.getPHPVersions.clearCache();
  }

  static async all(): Promise<PHPVersion[]> {
    const versions = await this.getPHPVersions();

    if (!versions) return [];

    const elements = versions.split(", ");

    const phpVersions: PHPVersion[] = [];
    let phpVersion: Partial<PHPVersion & { [key: string]: string | boolean }> = {};

    elements.forEach((element) => {
      if (element.startsWith("versions:")) {
        element = element.replace("versions:", "");
      }

      const [key, value] = element.split(":");
      phpVersion[key] = convertBooleanValue(value);

      if (key === "updateAvailable") {
        phpVersions.push(phpVersion as PHPVersion);
        phpVersion = {};
      }
    });

    return phpVersions;
  }

  static async installed(): Promise<PHPVersion[]> {
    const versions = await this.all();

    return versions.filter((version: PHPVersion) => version.installed);
  }

  static async current(): Promise<string> {
    return await Herd.runAppleScript<string>(
      `
        set phpInfo to get php version
        set phpVersion to version of phpInfo
        return phpVersion
        `,
      "string",
    );
  }

  static async setAsGlobalPHP(version: string): Promise<boolean> {
    await Herd.runAppleScript<boolean>(`use php "${version}"`);
    return true;
  }

  static async installPHPVersion(version: string): Promise<boolean> {
    await Herd.runAppleScript<boolean>(`install php "${version}"`, "boolean", 30 * 1000);
    return true;
  }

  static async updatePHPVersion(version: string): Promise<boolean> {
    await Herd.runAppleScript<boolean>(`update php "${version}"`, "boolean", 30 * 1000);
    return true;
  }

  private static async fetchPHPVersions(): Promise<string> {
    return await Herd.runAppleScript<string>(`get php versions`);
  }
}
