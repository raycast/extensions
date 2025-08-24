import { existsAsync, readDirectoryAsync, readFileAsync } from "../shared/fs-async";
import Path from "path";
import { XcodeSwiftPackageResolved } from "../models/swift-package-resolved/xcode-swift-package-resolved.model";
import { XcodeSwiftPackageResolvedEntry } from "../models/swift-package-resolved/xcode-swift-package-resolved-entry.model";
import { execAsync } from "../shared/exec-async";

/**
 * XcodeSwiftPackageResolvedService
 */
export class XcodeSwiftPackageResolvedService {
  /**
   * Retrieve Xcode Swift Package Resolved (Package.resolved) for a given Xcode Project
   * @param xcodeProjectDirectoryPath The Xcode Project directory path
   */
  static async getPackageResolved(xcodeProjectDirectoryPath: string): Promise<XcodeSwiftPackageResolved> {
    // Find the path to a package resolved file
    const packageResolvedPath = await XcodeSwiftPackageResolvedService.findPackageResolvedPath(
      xcodeProjectDirectoryPath
    );
    // Retrieve the contents of the package resolved and parse it as JSON
    const packageResolved = JSON.parse(await readFileAsync(packageResolvedPath, "utf-8"));
    // Initialize the package resolved pins
    const packageResolvedPins = packageResolved.pins ?? packageResolved.object?.pins;
    // Check if no package resolved pins are available
    if (!packageResolvedPins) {
      // Throw error
      throw Error("Invalid Package.resolved contents");
    }
    // Return Xcode Swift Package Resolved
    return {
      path: packageResolvedPath,
      entries: (packageResolvedPins as any[]).map((packageResolvedPin: any) => {
        return {
          name: packageResolvedPin.identity ?? packageResolvedPin.package,
          location: packageResolvedPin.location ?? packageResolvedPin.repositoryURL,
          branch: packageResolvedPin.state?.branch,
          revision: packageResolvedPin.state?.revision,
          version: packageResolvedPin.state?.version,
        };
      }),
    };
  }

  /**
   * Retrieve the latest version / tag for a given Xcode Swift Package Resolved Entry
   * @param entry The Xcode Swift Package Resolved Entry to retrieve the latest version
   */
  static getLatestVersion(entry: XcodeSwiftPackageResolvedEntry): Promise<string> {
    return execAsync(
      [`git ls-remote --tags --refs --sort="v:refname" ${entry.location}`, "tail -n1", "sed 's/.*\\///'"].join(" | ")
    ).then((output) => output.stdout.trim());
  }

  /**
   * Find the path to a "Package.resolved" at a given directory
   * @param directoryPath The directory path
   */
  private static async findPackageResolvedPath(directoryPath: string): Promise<string> {
    // Check if a "Package.resolved" file is available
    if (await existsAsync(Path.join(directoryPath, "Package.resolved"))) {
      // Return "Package.resolved" file path
      return Path.join(directoryPath, "Package.resolved");
    }
    // Read the contents of the directory
    const directoryContents = await readDirectoryAsync(directoryPath);
    // Find a file which has a ".xcodeproj" suffix
    const project = directoryContents.find((file) => file.endsWith(".xcodeproj"));
    // Check if a project file is available
    if (project) {
      // Initialize the project package resolved path
      const packageResolvedPath = Path.join(
        directoryPath,
        project,
        "project.xcworkspace/xcshareddata/swiftpm/Package.resolved"
      );
      // Check if the package resolved path exists
      if (await existsAsync(packageResolvedPath)) {
        // Return package resolved path of project
        return packageResolvedPath;
      }
    }
    // Find a file which has a ".xcworkspace" suffix
    const workspace = directoryContents.find((file) => file.endsWith(".xcworkspace"));
    // Check if a workspace file is available
    if (workspace) {
      // Initialize the workspace package resolved path
      const packageResolvedPath = Path.join(directoryPath, workspace, "xcshareddata/swiftpm/Package.resolved");
      // Check if the package resolved path exists
      if (await existsAsync(packageResolvedPath)) {
        // Return package resolved path of workspace
        return packageResolvedPath;
      }
    }
    // Check if a ".package.resolved" file is available
    if (await existsAsync(Path.join(directoryPath, ".package.resolved"))) {
      // Return ".package.resolved" file path
      return Path.join(directoryPath, ".package.resolved");
    }
    // Otherwise throw an error as no package resolved path could be found
    throw Error("No Package.resolved has been found");
  }
}
