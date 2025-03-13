import { XcodeProject } from "../models/xcode-project/xcode-project.model";
import { XcodeProjectType } from "../models/xcode-project/xcode-project-type.model";
import { execAsync } from "../shared/exec-async";
import { runAppleScript } from "../shared/run-apple-script";
import untildify from "untildify";
import * as Path from "path";
import { searchRecentProjectsCommandPreferences } from "../shared/preferences";

/**
 * XcodeProjectService
 */
export class XcodeProjectService {
  /**
   * Returns the Xcode projects.
   */
  static async xcodeProjects(): Promise<XcodeProject[]> {
    // Initialize the Spotlight search patterns
    const spotlightSearchPatterns = [
      "kMDItemDisplayName == *.xcodeproj",
      "kMDItemDisplayName == *.xcworkspace",
      "kMDItemDisplayName == Package.swift",
      "kMDItemDisplayName == *.playground",
    ];
    // Execute spotlight query
    const spotlightQueryOutput = await execAsync(
      `mdfind '${spotlightSearchPatterns.join(" || ")}' -onlyin ~ -attr kMDItemLastUsedDate`
    );
    // Retrieve the excluded Xcode Project Paths
    const excludedXcodeProjectPaths = XcodeProjectService.excludedXcodeProjectPaths();
    // Initialize regular expression
    const regularExpression = /^(.*?)\s+kMDItemLastUsedDate\s+=\s+(.*)$/;
    // Initialize Xcode project array
    const xcodeProjects: XcodeProject[] = [];
    // For each raw line of spotlight query output
    for (const rawLine of spotlightQueryOutput.stdout.trim().split("\n")) {
      // Trim the raw line
      const line = rawLine.trim();
      // Check if line is empty
      if (!line) {
        // Continue with next line
        continue;
      }
      // Declare path and last used date
      let path: string;
      let lastUsed: Date | undefined;
      // Perform regular expression
      const match = line.match(regularExpression);
      // Check if regular expression has two matches
      if (match && match.length > 2) {
        // Initialize path with first component of match
        path = match[1].trim();
        // Initialize last used date with second component of match
        const lastUsedDateString = match[2].trim();
        // Check if last used date string is not null
        if (lastUsedDateString !== "(null)") {
          // Initialize date from string
          const date = new Date(lastUsedDateString);
          // Initialize last used date
          lastUsed = isNaN(date.getTime()) ? undefined : date;
        }
      } else {
        // Otherwise use the line as path
        path = line;
      }
      // Check if path is excluded
      if (
        path.includes("Carthage/Checkouts") ||
        path.includes("/Pods/") ||
        path.includes("Library/Autosave Information") ||
        excludedXcodeProjectPaths.some((excludedPath) => path.startsWith(excludedPath))
      ) {
        // Continue with next line
        continue;
      }
      // Decode Xcode project
      const xcodeProject = XcodeProjectService.decodeXcodeProject(path, lastUsed);
      // Check if Xcode project could not be decoded from path
      if (!xcodeProject) {
        // Continue with next line
        continue;
      }
      // Append Xcode project
      xcodeProjects.push(xcodeProject);
    }
    // Sort Xcode projects by lastUsedDate (descending order).
    xcodeProjects.sort((lhs, rhs) => (rhs.lastUsed?.getTime() ?? 0) - (lhs.lastUsed?.getTime() ?? 0));
    // Return xcode projects
    return xcodeProjects;
  }

  /**
   * Retrieve the currently opened XcodeProjects
   */
  static async openedXcodeProjects(): Promise<XcodeProject[]> {
    // Declare opened XcodeProject paths
    let openedXcodeProjectPaths: string;
    try {
      // Run AppleScript to retrieve the opened XcodeProject paths
      openedXcodeProjectPaths = await runAppleScript([
        'tell application "Xcode"',
        "return path of workspace documents",
        "end tell",
      ]);
    } catch {
      // Catch error and return an empty error
      // usually the error indicates that either
      // Xcode is not installed or not running
      return [];
    }
    // Check if opened XcodeProject paths are empty
    if (!openedXcodeProjectPaths.trim()) {
      // Return an empty array
      return [];
    }
    // Decode opened XcodeProject paths
    return (
      openedXcodeProjectPaths
        // Split by semicolon
        .split(",")
        // Trim each path
        .map((path) => path.trim())
        .map((path) => {
          // Check if path does not contain a file extension
          if (!path.split("/").at(-1)?.includes(".")) {
            // As no file extension is available in the path
            // the opened XcodeProject path is a Swift Package Project
            // which has been opened by clicking the "Package.swift" file.
            // Therefore, the path will be appended with the "Package.swift" file
            return Path.join(path, "Package.swift");
          } else {
            // Otherwise, return unmodified path
            return path;
          }
        })
        // Decode each Xcode Project Path
        .map((xcodeProjectPath) => XcodeProjectService.decodeXcodeProject(xcodeProjectPath))
        // Filter out null values
        .filter(Boolean) as XcodeProject[]
    );
  }

  /**
   * Retrieve the excluded Xcode Project paths
   * which are configured via the Raycast Preferences
   */
  private static excludedXcodeProjectPaths(): string[] {
    // Retrieve the excluded Xcode Project paths string from preference values
    const excludedXcodeProjectPathsString = searchRecentProjectsCommandPreferences.excludedXcodeProjectPaths;
    // Check if excluded Xcode Project path string is falsy
    if (!excludedXcodeProjectPathsString) {
      // Return an empty array
      return [];
    }
    // Return excluded Xcode Project paths
    return (
      excludedXcodeProjectPathsString
        // Split by comma
        .split(",")
        // Trim each path
        .map((path) => path.trim())
        // Untildify each path
        .map((path) => untildify(path))
    );
  }

  /**
   * Decode XcodeProject from Xcode Project Path
   * @param xcodeProjectPath The Xcode Project Path
   * @param lastUsed The date when the project was last used or opened
   */
  private static decodeXcodeProject(xcodeProjectPath: string, lastUsed?: Date): XcodeProject | undefined {
    // Initialize the last path component
    const lastPathComponent = xcodeProjectPath.substring(xcodeProjectPath.lastIndexOf("/") + 1);
    // Initialize the file extension
    const fileExtension = lastPathComponent.split(".").at(-1);
    // Declare name
    let name: string;
    // Switch on file extension
    switch (fileExtension) {
      case XcodeProjectType.project:
      case XcodeProjectType.workspace:
      case XcodeProjectType.swiftPlayground: {
        // Initialize file name components
        const fileNameComponent = lastPathComponent.split(".");
        // Pop last file name component
        fileNameComponent.pop();
        // Initialize name with re-joined file name components
        name = fileNameComponent.join(".");
        break;
      }
      case XcodeProjectType.swiftPackage:
        // Initialize name by using the parent directory name otherwise use last path component
        name = xcodeProjectPath.split("/").at(-2) ?? lastPathComponent;
        break;
      default:
        // Unsupported/Unknown project type
        // Return undefined to exclude project
        return undefined;
    }
    // Initialize keywords
    let keywords = xcodeProjectPath.split("/");
    // Pop last element of keywords
    keywords.pop();
    // Push name to keywords
    keywords.push(name);
    // Filter out duplicates and empty keywords
    keywords = [...new Set(keywords.filter(Boolean))];
    // Return XcodeProject
    return {
      name: name,
      type: fileExtension,
      directoryPath: Path.dirname(xcodeProjectPath),
      filePath: xcodeProjectPath,
      lastUsed: lastUsed,
      keywords: keywords.reverse(),
    };
  }
}
