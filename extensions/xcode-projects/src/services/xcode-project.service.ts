import { getLocalStorageItem, setLocalStorageItem } from "@raycast/api";
import { XcodeProject } from "../models/xcode-project.model";
import { exec } from "child_process";
import { XcodeProjectType } from "../models/xcode-project-type.model";

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
    const xcodeProjectsJSON = await getLocalStorageItem<string>(
      this.xcodeProjectsJSONLocalStorageKey
    );
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
  private async cacheXcodeProjects(
    xcodeProjects: XcodeProject[]
  ) {
    // Store XcodeProjects JSON in LocalStorage
    return setLocalStorageItem(
      this.xcodeProjectsJSONLocalStorageKey,
      JSON.stringify(xcodeProjects)
    );
  }

  /**
   * Retrieve XcodeProjects
   */
  async xcodeProjects(): Promise<XcodeProject[]> {
    return new Promise((resolve, reject) => {
      // Execute command
      exec(
        "mdfind 'kMDItemDisplayName == Package.swift || kMDItemDisplayName == *.xcodeproj || kMDItemDisplayName == *.xcworkspace'",
        (error, stdout, stderr) => {
          // Check if an error is available
          if (stderr) {
            // Return out of function and reject with error
            return reject(stderr);
          }
          // Initialize XcodeProjects
          const xcodeProjects = stdout
            // Split standard output by new line
            .split("\n")
            // Filter out any Xcode Project that is included in Carthage/Checkouts or Pods from CocoaPods
            .filter(xcodeProjectPath => {
              return !xcodeProjectPath.includes("Carthage/Checkouts")
                && !xcodeProjectPath.includes("Pods")
                && !xcodeProjectPath.includes("Library/Autosave Information");
            })
            // Decode each Xcode Project Path
            .map(xcodeProjectPath => XcodeProjectService.decodeXcodeProject(xcodeProjectPath))
            // Filter out null values
            .filter(xcodeProject => !!xcodeProject) as XcodeProject[];
          // Resolve with XcodeProjects
          resolve(xcodeProjects);
          // Cache XcodeProjects
          this.cacheXcodeProjects(xcodeProjects);
        }
      );
    });
  }

  /**
   * Decode XcodeProject from Xcode Project Path
   * @param xcodeProjectPath The Xcode Project Path
   */
  private static decodeXcodeProject(
    xcodeProjectPath: string
  ): XcodeProject | undefined {
    // Initialize the last path component
    const lastPathComponent = xcodeProjectPath.substring(xcodeProjectPath.lastIndexOf("/") + 1);
    // Initialize the file extension
    const fileExtension = lastPathComponent.split(".").at(-1);
    // Initialize keywords
    let keywords = xcodeProjectPath.split("/");
    // Pop last element of keywords
    keywords.pop();
    // Filter out empty keywords
    keywords = keywords.filter(Boolean)
    // Declare name
    let name: string
    // Switch on file extension
    switch (fileExtension) {
      case XcodeProjectType.project:
      case XcodeProjectType.workspace:
        name = lastPathComponent.split(".")[0];
        break;
      case XcodeProjectType.swiftPackage:
        name = xcodeProjectPath.split("/").at(-2) ?? lastPathComponent;
        break;
      default:
        // Unsupported/Unknown project type
        // Return undefined to exclude project
        return undefined;
    }
    // Push name to keywords
    keywords.push(name);
    // Filter out duplicates
    keywords = [...new Set(keywords)];
    // Return XcodeProject
    return {
      name: name,
      type: fileExtension,
      filePath: xcodeProjectPath,
      keywords: keywords.reverse()
    };
  }

}
