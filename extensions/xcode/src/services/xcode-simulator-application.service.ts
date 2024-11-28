import { XcodeSimulatorService } from "./xcode-simulator.service";
import { execAsync } from "../shared/exec-async";
import { existsAsync, readDirectoryAsync } from "../shared/fs-async";
import { XcodeSimulator } from "../models/xcode-simulator/xcode-simulator.model";
import { XcodeSimulatorApplication } from "../models/xcode-simulator/xcode-simulator-application.model";
import * as Path from "path";
import { XcodeSimulatorApplicationGroup } from "../models/xcode-simulator/xcode-simulator-application-group.model";
import { groupBy } from "../shared/group-by";
import { XcodeSimulatorState } from "../models/xcode-simulator/xcode-simulator-state.model";

interface XcodeSimulatorApplicationPath {
  /**
   * The bundle identifier
   */
  bundleIdentifier: string;
  /**
   * The path (AppGroup | Sandbox)
   */
  path: string;
}

/**
 * XcodeSimulatorApplicationService
 */
export class XcodeSimulatorApplicationService {
  /**
   * The Simulator SandBox Paths Map Cache
   */
  private static simulatorSandBoxPathsCache = new Map<XcodeSimulator, Promise<XcodeSimulatorApplicationPath[]>>();

  /**
   * The Simulator AppGroup Paths Map Cache
   */
  private static simulatorAppGroupPathsCache = new Map<XcodeSimulator, Promise<XcodeSimulatorApplicationPath[]>>();

  /**
   * Retrieve all XcodeSimulatorApplicationGroups
   */
  static async xcodeSimulatorApplicationGroups(): Promise<XcodeSimulatorApplicationGroup[]> {
    const xcodeSimulatorApplications = await XcodeSimulatorApplicationService.xcodeSimulatorApplications();
    return groupBy(xcodeSimulatorApplications, (application) => application.simulator).map((group) => {
      return { simulator: group.key, applications: group.values.sort((lhs, rhs) => lhs.name.localeCompare(rhs.name)) };
    });
  }

  /**
   * Retrieve all XcodeSimulatorApplications
   */
  static async xcodeSimulatorApplications(): Promise<XcodeSimulatorApplication[]> {
    // Retrieve all Simulators
    const simulators = await XcodeSimulatorService.xcodeSimulators();
    // Find all Applications installed in each XcodeSimulator
    return ([] as XcodeSimulatorApplication[]).concat(
      ...(
        await Promise.allSettled(simulators.map(XcodeSimulatorApplicationService.findXcodeSimulatorApplications))
      ).map((result) => (result.status === "fulfilled" ? result.value : []))
    );
  }

  /**
   * Find all XcodeSimulatorApplications of a given XcodeSimulator
   * @param simulator The XcodeSimulator
   */
  static async findXcodeSimulatorApplications(simulator: XcodeSimulator): Promise<XcodeSimulatorApplication[]> {
    // The container application directory path
    const containerApplicationDirectoryPath = Path.join(simulator.dataPath, "Containers/Bundle/Application");
    // Declare Application Directory Paths
    let applicationDirectoryPaths: string[];
    try {
      // Read application child directories paths
      applicationDirectoryPaths = await readDirectoryAsync(containerApplicationDirectoryPath, {
        withFileTypes: true,
      }).then((entries) => {
        return entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => Path.join(containerApplicationDirectoryPath, entry.name));
      });
    } catch {
      // On error return empty applications
      return [];
    }
    // Retrieve all Applications in parallel
    const applications = (
      await Promise.allSettled(
        applicationDirectoryPaths.map((applicationDirectoryPath) =>
          XcodeSimulatorApplicationService.findXcodeSimulatorApplication(simulator, applicationDirectoryPath)
        )
      )
    ).map((result) => (result.status === "fulfilled" ? result.value : undefined));
    // Filter out falsy values and return Applications
    return applications.filter(Boolean) as XcodeSimulatorApplication[];
  }

  /**
   * Find a XcodeSimulatorApplication on the XcodeSimulator for a given application directory path
   * @param simulator The XcodeSimulator
   * @param applicationDirectoryPath The application directory path
   */
  private static async findXcodeSimulatorApplication(
    simulator: XcodeSimulator,
    applicationDirectoryPath: string
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
              Path.join(
                applicationDirectoryPath,
                applicationFileName
                  // Escape whitespaces
                  .replace(" ", "\\ "),
                "Info.plist"
              ),
              "-o",
              // By using a dash ("-") for the -o parameter value the output
              // will be printed in the stdout instead into a local file
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
    const bundleIdentifier = infoPlistJSON["CFBundleIdentifier"]?.trim();
    // Check if bundle identifier is not available
    if (!bundleIdentifier) {
      // Return no application
      return undefined;
    }
    // Find sandbox directory path
    const sandBoxDirectoryPath = await XcodeSimulatorApplicationService.findSandboxDirectoryPath(
      simulator,
      bundleIdentifier
    );
    // Check if SandBox directory path is not available
    if (!sandBoxDirectoryPath) {
      // Return no application
      return undefined;
    }
    // Find appGroup directory path
    const appGroupPath = await XcodeSimulatorApplicationService.findAppGroupDirectoryPath(simulator, bundleIdentifier);
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
        const applicationFileNames = await readDirectoryAsync(Path.join(applicationDirectoryPath, applicationFileName));
        // Find matching application file name that starts with the primary app icon name
        const matchingApplicationFileName = applicationFileNames.find((fileName) =>
          fileName.startsWith(primaryAppIconName)
        );
        // Check if a matching application file name is available
        if (matchingApplicationFileName) {
          // Initialize app icon path
          appIconPath = Path.join(applicationDirectoryPath, applicationFileName, matchingApplicationFileName);
        }
      } catch {
        // Simply ignore this error
        // as we treat the appIconPath as an optional value
      }
    }
    // Initialize user defaults plist path
    let userDefaultsPlistPath: string | undefined = Path.join(
      sandBoxDirectoryPath,
      "Library",
      "Preferences",
      `${bundleIdentifier}.plist`
    );
    // Check if user defaults plist does not exists
    if (!(await existsAsync(userDefaultsPlistPath))) {
      // Clear user defaults plist path
      userDefaultsPlistPath = undefined;
    }
    // Return Application
    return {
      id: [simulator.udid, bundleIdentifier].join("/"),
      name: applicationName,
      bundleIdentifier: bundleIdentifier,
      version: version,
      buildNumber: buildNumber,
      appIconPath: appIconPath,
      simulator: simulator,
      bundlePath: applicationDirectoryPath,
      sandBoxPath: sandBoxDirectoryPath,
      sandBoxDocumentsPath: Path.join(sandBoxDirectoryPath, "Documents"),
      sandBoxCachesPath: Path.join(sandBoxDirectoryPath, "Library", "Caches"),
      appGroupPath: appGroupPath,
      userDefaultsPlistPath: userDefaultsPlistPath,
    };
  }

  /**
   * Find Sandbox directory path for a given XcodeSimulator and bundle identifier
   * @param simulator The XcodeSimulator
   * @param bundleIdentifier The bundle identifier
   * @private
   */
  private static async findSandboxDirectoryPath(
    simulator: XcodeSimulator,
    bundleIdentifier: string
  ): Promise<string | undefined> {
    // Check if simulator is booted
    if (simulator.state === XcodeSimulatorState.booted) {
      try {
        // Try to retrieve sandbox directory path via the simctl cli
        // which is much quicker than the following fallback mechanism
        return (
          await execAsync(`xcrun simctl get_app_container ${simulator.udid} ${bundleIdentifier} data`)
        ).stdout.trim();
        // eslint-disable-next-line no-empty
      } catch {
        // Ignore error as we continue with the fallback mechanism
      }
    }
    // Initialize simulator sandbox paths promise by using the cache
    let simulatorSandBoxPathsPromise = XcodeSimulatorApplicationService.simulatorSandBoxPathsCache.get(simulator);
    // Check if simulator sandbox paths promise is unavailable / no cache entry is available
    if (!simulatorSandBoxPathsPromise) {
      // Initialize simulator data application directory path
      const dataApplicationDirectoryPath = Path.join(simulator.dataPath, "Containers/Data/Application");
      //get sandbox paths from a directory
      simulatorSandBoxPathsPromise = this.getApplicationPathFromDirectory(dataApplicationDirectoryPath);
      // Set simulator sandbox paths promise so that the sandbox paths are only read once per simulator
      XcodeSimulatorApplicationService.simulatorSandBoxPathsCache.set(simulator, simulatorSandBoxPathsPromise);
    }
    // Return sandbox path where the bundle identifier matches
    return (await simulatorSandBoxPathsPromise)?.find(
      (simulatorSandBoxPath) => simulatorSandBoxPath.bundleIdentifier === bundleIdentifier
    )?.path;
  }

  /**
   * Find AppGroup directory path for a given XcodeSimulator and bundle identifier
   * @param simulator The XcodeSimulator
   * @param bundleIdentifier The bundle identifier
   * @private
   */
  private static async findAppGroupDirectoryPath(
    simulator: XcodeSimulator,
    bundleIdentifier: string
  ): Promise<string | undefined> {
    // Check if simulator is booted
    if (simulator.state === XcodeSimulatorState.booted) {
      try {
        // Try to retrieve AppGroup directory path via the simctl cli
        // which is much quicker than the following fallback mechanism
        const xcrunResult = (
          await execAsync(`xcrun simctl get_app_container ${simulator.udid} ${bundleIdentifier} groups`)
        ).stdout.trim();
        if (xcrunResult.length > 0) {
          const groupPathSplit = xcrunResult.split("\t");
          if (groupPathSplit.length === 2) {
            return groupPathSplit[1].replaceAll("\n", "");
          }
        }
        // eslint-disable-next-line no-empty
      } catch {
        // Ignore error as we continue with the fallback mechanism
      }
    }
    // Initialize simulator AppGroup paths promise by using the cache
    let simulatorAppGroupPathsPromise = XcodeSimulatorApplicationService.simulatorAppGroupPathsCache.get(simulator);
    // Check if simulator AppGroup paths promise is unavailable / no cache entry is available
    if (!simulatorAppGroupPathsPromise) {
      // Initialize simulator data application directory path
      const appGroupDirectoryPath = Path.join(simulator.dataPath, "Containers/Shared/AppGroup");
      //get AppGroup paths from a directory
      simulatorAppGroupPathsPromise =
        XcodeSimulatorApplicationService.getApplicationPathFromDirectory(appGroupDirectoryPath);
      // Set simulator AppGroup paths promise so that the AppGroup paths are only read once per simulator
      XcodeSimulatorApplicationService.simulatorAppGroupPathsCache.set(simulator, simulatorAppGroupPathsPromise);
    }
    // Return AppGroup path where the bundle identifier matches
    return (await simulatorAppGroupPathsPromise)?.find(
      (simulatorAppGroupxPath) => simulatorAppGroupxPath.bundleIdentifier === `group.${bundleIdentifier}`
    )?.path;
  }

  /**
   * Get Application Path from a Directory
   * @param applicationPath The Application path Inside a Container
   * @private
   */
  private static async getApplicationPathFromDirectory(
    applicationPath: string
  ): Promise<XcodeSimulatorApplicationPath[]> {
    // 1. Reading the data application directory path child directories
    // 2. Retrieve all bundle identifiers alongside with the directory path (Sandbox | AppGroup)
    return execAsync(
      [
        // List all child directories in data application directory
        `ls -l ${applicationPath}`,
        // Format output in the following format "{Month}-{Day}-{Hour}-{Minute} {Path}"
        `awk '{print $6 "-" $7 "-" $8 " " $9}'`,
        // Remove duplicates by first component (separated by whitespace)
        `awk '!seen[$1]++'`,
        // Drop first component (separated by whitespace)
        `awk '{$1=""; print $0}'`,
      ].join(" | ")
    )
      .then((output) =>
        output.stdout
          .trim()
          .split("\n")
          .map((path) => Path.join(applicationPath, path.trim()))
      )
      .then((paths) =>
        Promise.allSettled(
          paths.map((path) =>
            execAsync(
              [
                "defaults",
                "read",
                Path.join(path, ".com.apple.mobile_container_manager.metadata.plist"),
                "MCMMetadataIdentifier",
              ].join(" ")
            ).then((output) => {
              const bundleIdentifier = output.stdout.trim();
              if (bundleIdentifier) {
                return {
                  bundleIdentifier: bundleIdentifier,
                  path: path,
                };
              } else {
                return undefined;
              }
            })
          )
        ).then(
          (results) =>
            results
              .map((result) => (result.status == "fulfilled" ? result.value : undefined))
              .filter(Boolean) as XcodeSimulatorApplicationPath[]
        )
      );
  }
}
