import { XcodeSimulatorApplication } from "../models/simulator/xcode-simulator-application.model";
import { XcodeSimulatorService } from "./xcode-simulator.service";
import { execAsync } from "../shared/exec-async";
import { XcodeSimulator } from "../models/simulator/xcode-simulator.model";
import { getLocalStorageItem, setLocalStorageItem } from "@raycast/api";
import { readDirectoryAsync } from "../shared/fs-async";
import { joinPathComponents } from "../shared/join-path-components";

/**
 * XcodeSimulatorApplicationService
 */
export class XcodeSimulatorApplicationService {
  /**
   * The XcodeSimulatorService
   */
  private xcodeSimulatorService = new XcodeSimulatorService();

  /**
   * The XcodeSimulatorApplications JSON LocalStorage Key
   */
  private xcodeSimulatorApplicationsJSONLocalStorageKey = "xcode-simulator-applications";

  /**
   * Retrieve the cached XcodeSimulatorApplications, if available
   */
  async cachedXcodeSimulatorApplications(): Promise<XcodeSimulatorApplication[] | undefined> {
    // Retrieve XcodeSimulatorApplications JSON from LocalStorage
    const xcodeSimulatorApplications = await getLocalStorageItem<string>(
      this.xcodeSimulatorApplicationsJSONLocalStorageKey
    );
    // Check if XcodeSimulatorApplications JSON is not available
    if (!xcodeSimulatorApplications) {
      // Return undefined
      return undefined;
    }
    // Return parsed XcodeSimulatorApplications
    return JSON.parse(xcodeSimulatorApplications);
  }

  /**
   * Cache XcodeSimulatorApplications
   * @param xcodeSimulatorApplications The XcodeSimulatorApplications that should be cached
   */
  private cacheXcodeSimulatorApplication(xcodeSimulatorApplications: XcodeSimulatorApplication[]): Promise<void> {
    // Store XcodeSimulatorApplications JSON in LocalStorage
    return setLocalStorageItem(
      this.xcodeSimulatorApplicationsJSONLocalStorageKey,
      JSON.stringify(xcodeSimulatorApplications)
    );
  }

  /**
   * Retrieve all installed XcodeSimulatorApplication
   */
  async xcodeSimulatorApplications(): Promise<XcodeSimulatorApplication[]> {
    // Retrieve all Simulators
    const simulators = await this.xcodeSimulatorService.getXcodeSimulators();
    // Find all Applications installed in each XcodeSimulator in parallel
    const allApplications = await Promise.all(simulators.map(this.findXcodeSimulatorApplications));
    // Flat map 2D Array to 1D
    const applications = ([] as XcodeSimulatorApplication[]).concat(...allApplications);
    // Cache Applications
    this.cacheXcodeSimulatorApplication(applications).then();
    // Return Applications
    return applications;
  }

  /**
   * Find all installed applications of the given XcodeSimulator
   * @param simulator The XcodeSimulator
   */
  private async findXcodeSimulatorApplications(simulator: XcodeSimulator): Promise<XcodeSimulatorApplication[]> {
    // The container application directory path
    const containerApplicationDirectoryPath = joinPathComponents(simulator.dataPath, "Containers/Bundle/Application");
    /// The container sandbox directory path
    const containerSandboxDirectoryPath = joinPathComponents(simulator.dataPath, "Containers/Data/Application");
    // Declare Application Directory Paths
    let applicationDirectoryPaths: string[];
    // Declare SandBox Directory Paths
    let sandBoxDirectoryPaths: string[];
    // Declare SandBox Directory Bundle identifiers
    let sandBoxDirectoryBundleIds: string[];
    try {
      // Read application child directories paths
      applicationDirectoryPaths = await readDirectoryAsync(containerApplicationDirectoryPath, {
        withFileTypes: true,
      }).then((entries) => {
        return entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => joinPathComponents(containerApplicationDirectoryPath, entry.name));
      });
      // Read SandBox child directory paths
      sandBoxDirectoryPaths = await readDirectoryAsync(containerSandboxDirectoryPath, {
        withFileTypes: true,
      }).then((entries) => {
        return entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => joinPathComponents(containerSandboxDirectoryPath, entry.name));
      });
      // Read SandBox Bundle identifiers for each SandBox directory path
      sandBoxDirectoryBundleIds = (
        await execAsync(
          sandBoxDirectoryPaths
            .map((sandBoxDirectoryPath) => {
              return [
                "defaults",
                "read",
                joinPathComponents(sandBoxDirectoryPath, ".com.apple.mobile_container_manager.metadata.plist"),
                "MCMMetadataIdentifier",
              ].join(" ");
            })
            .join(" && ")
        )
      ).stdout
        .split("\n")
        .map((bundleId) => bundleId.trim());
    } catch {
      // On error return empty applications
      return [];
    }
    // Initialize a Map which holds a bundle identifier as a key
    // and the corresponding SandBox directory path as a value
    const sandBoxBundleIdDirectoryPathMap = new Map<string, string>();
    // For each SandBox directory bundle identifier entries
    for (const [index, bundleId] of sandBoxDirectoryBundleIds.entries()) {
      // Retrieve SandBox directory path at the same index as the bundle identifier
      const sandBoxDirectoryPath = sandBoxDirectoryPaths.at(index);
      // Check if SandBox directory path is not available
      if (!sandBoxDirectoryPath) {
        // Continue with next bundle identifier
        continue;
      }
      // Set bundle identifier and the corresponding SandBox directory path
      sandBoxBundleIdDirectoryPathMap.set(bundleId, sandBoxDirectoryPath);
    }
    // Retrieve all Applications in parallel
    const applications = await Promise.all(
      applicationDirectoryPaths.map((applicationDirectoryPath) => {
        return XcodeSimulatorApplicationService.findXcodeSimulatorApplication(
          simulator,
          applicationDirectoryPath,
          sandBoxBundleIdDirectoryPathMap
        );
      })
    );
    // Filter out falsy values and return Applications
    return applications.filter((application) => !!application) as XcodeSimulatorApplication[];
  }

  /**
   * Find an Application that is installed on the XcodeSimulator
   * @param simulator The XcodeSimulator
   * @param applicationDirectoryPath The Application directory path
   * @param sandBoxBundleIdDirectoryPathMap The SandBox bundle identifier directory path map
   */
  private static async findXcodeSimulatorApplication(
    simulator: XcodeSimulator,
    applicationDirectoryPath: string,
    sandBoxBundleIdDirectoryPathMap: Map<string, string>
  ): Promise<XcodeSimulatorApplication | undefined> {
    // Declare application file name
    let applicationFileName: string;
    try {
      // Retrieve file names in application directory
      const fileNames = await readDirectoryAsync(applicationDirectoryPath);
      // Initialize matching application file name where file name ends with '.app'
      const matchingApplicationFileName = fileNames.find((fileName) => fileName.endsWith(".app"));
      // Check if matching application file name is unavailable
      if (!matchingApplicationFileName) {
        // Return no application
        return undefined;
      }
      // Initialize Application file name
      applicationFileName = matchingApplicationFileName;
    } catch {
      // On error return no application
      return undefined;
    }
    // Declare Info.plist JSON
    let infoPlistJSON: any;
    try {
      // Try to parse Info.plist JSON
      // using 'plutil' to convert the Info.plist XML to JSON format
      infoPlistJSON = JSON.parse(
        (
          await execAsync(
            [
              "plutil",
              "-convert",
              "json",
              joinPathComponents(
                applicationDirectoryPath,
                applicationFileName
                  // Escape whitespaces
                  .replace(" ", "\\ "),
                "Info.plist"
              ),
              "-o",
              /* Important note:
                 By using a dash ("-") for the -o parameter value
                 the output will be printed in the stdout instead into a local file
                 Read more: https://www.manpagez.com/man/1/plutil/
              */
              "-",
            ].join(" ")
          )
        ).stdout.trim()
      );
    } catch {
      // Return no application
      return undefined;
    }
    // Declare bundle identifier
    const bundleIdentifier = infoPlistJSON["CFBundleIdentifier"];
    // Check if bundle identifier is not available
    if (!bundleIdentifier) {
      // Return no application
      return undefined;
    }
    // Retrieve possible SandBox directory path for bundle identifier
    const sandBoxDirectoryPath = sandBoxBundleIdDirectoryPathMap.get(bundleIdentifier);
    // Check if SandBox directory path is not available
    if (!sandBoxDirectoryPath) {
      // Return no application
      return undefined;
    }
    // Retrieve version from Info.plist
    const version = infoPlistJSON["CFBundleShortVersionString"];
    // Retrieve build number from Info.plist
    const buildNumber = infoPlistJSON["CFBundleVersion"];
    // Retrieve application name from Info.plist
    // by either using the `CFBundleDisplayName` or `CFBundleName`
    // otherwise use application file name as fallback
    const applicationName =
      infoPlistJSON["CFBundleDisplayName"] ?? infoPlistJSON["CFBundleName"] ?? applicationFileName.split(".")[0];
    // Retrieve primary app icon name from Info.plist
    const primaryAppIconName = infoPlistJSON["CFBundleIcons"]?.["CFBundlePrimaryIcon"]?.["CFBundleIconFiles"]?.at(0);
    // Declare an optional app icon path
    let appIconPath: string | undefined;
    // Check if a primary app icon name is available
    if (primaryAppIconName) {
      try {
        // Read file names in application
        const applicationFileNames = await readDirectoryAsync(
          joinPathComponents(applicationDirectoryPath, applicationFileName)
        );
        // Find matching application file name that starts with the primary app icon name
        const matchingApplicationFileName = applicationFileNames.find((fileName) =>
          fileName.startsWith(primaryAppIconName)
        );
        // Check if a matching application file name is available
        if (matchingApplicationFileName) {
          // Initialize app icon path
          appIconPath = joinPathComponents(applicationDirectoryPath, applicationFileName, matchingApplicationFileName);
        }
      } catch {
        // Simply ignore this error
        // as we treat the appIconPath as an optional value
      }
    }
    // Return Application
    return {
      name: applicationName,
      bundleIdentifier: bundleIdentifier.trim(),
      version: version,
      buildNumber: buildNumber,
      appIconPath: appIconPath,
      simulator: simulator,
      bundlePath: applicationDirectoryPath,
      sandBoxPath: sandBoxDirectoryPath,
      sandBoxDocumentsPath: joinPathComponents(sandBoxDirectoryPath, "Documents"),
      sandBoxCachesPath: joinPathComponents(sandBoxDirectoryPath, "Library", "Caches"),
    };
  }
}
