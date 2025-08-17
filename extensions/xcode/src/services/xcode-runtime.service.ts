import { XcodeRuntimeGroup } from "../models/xcode-runtime/xcode-runtime-group.model";
import { XcodeRuntimePlatformFilter } from "../models/xcode-runtime/xcode-runtime-platform-filter.model";
import { XcodeRuntimePlatform } from "../models/xcode-runtime/xcode-runtime-platform.model";
import { XcodeRuntime } from "../models/xcode-runtime/xcode-runtime.model";
import { execAsync } from "../shared/exec-async";
import { groupBy } from "../shared/group-by";

/**
 * XcodeRuntimeService
 */
export class XcodeRuntimeService {
  static async xcodeRuntimeGroups(filter: XcodeRuntimePlatformFilter): Promise<XcodeRuntimeGroup[]> {
    const runtimes = await XcodeRuntimeService.xcodeRuntimes();
    return groupBy(
      runtimes.filter(
        (value) =>
          filter === XcodeRuntimePlatformFilter.all || value.platform === (filter as unknown as XcodeRuntimePlatform)
      ),
      (runtime) => runtime.platform
    )
      .map((group) => {
        return {
          platform: group.key,
          runtimes: group.values,
        };
      })
      .sort((lhs, rhs) => lhs.platform.localeCompare(rhs.platform));
  }

  /**
   * Retrieve all installed XcodeRuntimes
   */
  static async xcodeRuntimes(): Promise<XcodeRuntime[]> {
    const output = await execAsync("xcrun simctl list -j -v runtimes");
    const runtimesResponseJSON = JSON.parse(output.stdout);
    if (!runtimesResponseJSON || !runtimesResponseJSON.runtimes) {
      throw [];
    }

    const result: XcodeRuntime[] = runtimesResponseJSON.runtimes.map(
      (runtime: {
        name: string;
        isAvailable: boolean;
        platform: string;
        version: string;
        buildversion: string;
        lastUsage: Record<string, string>;
      }): XcodeRuntime => {
        const lastUsageValues = Object.values(runtime.lastUsage || {});
        const lastUsageDate =
          lastUsageValues.length > 0
            ? new Date(Math.max(...lastUsageValues.map((timestamp) => new Date(timestamp).getTime())))
            : undefined;

        const isDefaultDate = lastUsageDate && lastUsageDate.getFullYear() === 1;
        const lastUsage = isDefaultDate ? undefined : lastUsageDate;
        return {
          name: runtime.name,
          isSupported: runtime.isAvailable,
          platform: runtime.platform as unknown as XcodeRuntimePlatform,
          version: runtime.version,
          buildVersion: runtime.buildversion,
          lastUsageDate: lastUsage,
        };
      }
    );
    return result.sort((lhs, rhs) => rhs.buildVersion.localeCompare(lhs.buildVersion));
  }

  static async deleteXcodeRuntime(runtime: XcodeRuntime): Promise<void> {
    await execAsync(`xcrun simctl runtime delete ${runtime.buildVersion}`);
  }

  static async deleteUnsupportedXcodeRuntimes(): Promise<void> {
    const runtimes = await XcodeRuntimeService.xcodeRuntimes();
    const unsupportedRuntimes = runtimes.filter((runtime) => runtime.isSupported === false);
    for (const runtime of unsupportedRuntimes) {
      await XcodeRuntimeService.deleteXcodeRuntime(runtime);
    }
  }
}
