import { getLocalStorageItem, getPreferenceValues, setLocalStorageItem } from "@raycast/api";
import { XcodeProject } from "../models/project/xcode-project.model";
import { XcodeProjectType } from "../models/project/xcode-project-type.model";
import { execAsync } from "../shared/exec-async";
import { runAppleScript } from "../shared/run-apple-script";
import { joinPathComponents } from "../shared/join-path-components";
import untildify from "untildify";

/**
 * XcodeProjectService
 */
export class XcodeProjectService {
  /**
   * The XcodeProjects JSON LocalStorage Key
   */
  private xcodeProjectsJSONLocalStorageKey = "xcode-projects";

  /**
   * Retrieve the cached XcodeProjects, if available
   */
  async cachedXcodeProjects(): Promise<XcodeProject[] | undefined> {
    // Retrieve XcodeProjects JSON from LocalStorage
    const xcodeProjectsJSON = await getLocalStorageItem<string>(this.xcodeProjectsJSONLocalStorageKey);
    // Check if XcodeProjects JSON is not available
    if (!xcodeProjectsJSON) {
      // Return undefined
      return undefined;
    }
    // Return parsed XcodeProjects
    return JSON.parse(xcodeProjectsJSON);
  }

  /**
   * Cache XcodeProjects
   * @param xcodeProjects The XcodeProjects that should be cached
   */
  private cacheXcodeProjects(xcodeProjects: XcodeProject[]): Promise<void> {
    // Store XcodeProjects JSON in LocalStorage
    return setLocalStorageItem(this.xcodeProjectsJSONLocalStorageKey, JSON.stringify(xcodeProjects));
  }

  /**
   * Retrieve the excluded Xcode Project paths
   * which are configured via the Raycast Preferences
   */
  private excludedXcodeProjectPaths(): string[] {
    // Retrieve the preference values
    const preferences = getPreferenceValues();
    // Retrieve the excluded Xcode Project paths string from preference values
    const excludedXcodeProjectPathsString = preferences.excludedXcodeProjectPaths as string;
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
   * Retrieve XcodeProjects
   */
  async xcodeProjects(): Promise<XcodeProject[]> {
    // Initialize Spotlight Search Parameters
    const spotlightSearchParameters = [
      "kMDItemDisplayName == *.xcodeproj",
      "kMDItemDisplayName == *.xcworkspace",
      "kMDItemDisplayName == Package.swift",
      "kMDItemDisplayName == *.playground",
    ];
    // Execute command
    const output = await execAsync(`mdfind '${spotlightSearchParameters.join(" || ")}'`);
    // Retrieve the excluded Xcode Project Paths
    const excludedXcodeProjectPaths = this.excludedXcodeProjectPaths();
    // Initialize XcodeProjects
    const xcodeProjects = output.stdout
      // Split standard output by new line
      .split("\n")
      // Filter out any Xcode Project that is included in Carthage/Checkouts or Pods from CocoaPods
      .filter((xcodeProjectPath) => {
        return (
          !xcodeProjectPath.includes("Carthage/Checkouts") &&
          !xcodeProjectPath.includes("Pods") &&
          !xcodeProjectPath.includes("Library/Autosave Information")
        );
      })
      // Filter out Xcode Projects that should be excluded based on the preferences
      .filter((xcodeProjectPath) => {
        return !excludedXcodeProjectPaths.find((excludedPath) => xcodeProjectPath.startsWith(excludedPath));
      })
      // Decode each Xcode Project Path
      .map((xcodeProjectPath) => XcodeProjectService.decodeXcodeProject(xcodeProjectPath))
      // Filter out null values
      .filter((xcodeProject) => !!xcodeProject) as XcodeProject[];
    // Cache XcodeProjects
    this.cacheXcodeProjects(xcodeProjects).then();
    // Return XcodeProjects
    return xcodeProjects;
  }

  /**
   * Retrieve the currently opened XcodeProjects
   */
  async openedXcodeProjects(): Promise<XcodeProject[]> {
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
            // Therefore the path will be appended with the "Package.swift" file
            return joinPathComponents(path, "Package.swift");
          } else {
            // Otherwise return unmodified path
            return path;
          }
        })
        // Decode each Xcode Project Path
        .map((xcodeProjectPath) => XcodeProjectService.decodeXcodeProject(xcodeProjectPath))
        // Filter out null values
        .filter((xcodeProject) => !!xcodeProject) as XcodeProject[]
    );
  }

  /**
   * Decode XcodeProject from Xcode Project Path
   * @param xcodeProjectPath The Xcode Project Path
   */
  private static decodeXcodeProject(xcodeProjectPath: string): XcodeProject | undefined {
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
      case XcodeProjectType.swiftPlayground:
        // Initialize file name components
        const fileNameComponent = lastPathComponent.split(".");
        // Pop last file name component
        fileNameComponent.pop();
        // Initialize name with re-joined file name components
        name = fileNameComponent.join(".");
        break;
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
      filePath: xcodeProjectPath,
      keywords: keywords.reverse(),
    };
  }
}
