import { withCache } from "@raycast/utils";
import { NodeVersion } from "../../lib/types/nodeVersion";
import { Herd } from "../Herd";
import { convertBooleanValue } from "../convertBooleanValue";

export class Node {
  private static getNodeVersions = withCache(Node.fetchNodeVersions, {
    maxAge: 60 * 60 * 1000,
  });

  static clearCache() {
    this.getNodeVersions.clearCache();
  }

  static async all(): Promise<NodeVersion[]> {
    const versions = await this.getNodeVersions();

    if (!versions) return [];

    const elements = versions.split(", ");

    const nodeVersions: NodeVersion[] = [];
    let nodeVersion: Partial<NodeVersion & { [key: string]: string | boolean }> = {};

    elements.forEach((element) => {
      if (element.startsWith("versions:")) {
        element = element.replace("versions:", "");
      }

      const [key, value] = element.split(":");
      nodeVersion[key] = convertBooleanValue(value);

      if (key === "updateAvailable") {
        nodeVersions.push(nodeVersion as NodeVersion);
        nodeVersion = {};
      }
    });

    return nodeVersions;
  }

  static async installed(): Promise<NodeVersion[]> {
    const versions = await this.all();

    return versions.filter((version: NodeVersion) => version.installed);
  }

  private static async fetchNodeVersions(): Promise<string> {
    return await Herd.runAppleScript<string>(`get node versions`);
  }
}
