import { XcodeSwiftPackage } from "../models/swift-package/xcode-swift-package.model";
import { execAsync } from "../shared/exec-async";
import { XcodeSwiftPackageCreationParameters } from "../models/swift-package/xcode-swift-package-creation-parameters.model";
import { runAppleScript } from "../shared/run-apple-script";
import { XcodeSwiftPackageMetadata } from "../models/swift-package/xcode-swift-package-metadata.model";
import { URL } from "url";
import fetch from "node-fetch";
import * as Path from "path";

/**
 * XcodeSwiftPackageService
 */
export class XcodeSwiftPackageService {
  /**
   * Create Swift Package from parameters
   */
  static createSwiftPackage(parameters: XcodeSwiftPackageCreationParameters): Promise<XcodeSwiftPackage> {
    // Initialize Swift Package path
    const swiftPackagePath = Path.join(parameters.location, parameters.name);
    // Execute command
    return execAsync(
      [
        // Make directory
        `mkdir -p ${swiftPackagePath}`,
        // Switch to directory
        `cd ${swiftPackagePath}`,
        // Create Swift Package
        ["swift", "package", "init", "--name", parameters.name, "--type", parameters.type].join(" "),
      ].join(" && ")
    ).then(() => {
      // Return Swift Package
      return {
        name: parameters.name,
        type: parameters.type,
        path: swiftPackagePath,
        open: () => {
          // Open Package.swift
          return execAsync(`open ${swiftPackagePath}/Package.swift`).then();
        },
      };
    });
  }

  /**
   * Retrieve a boolean if a given Swift Package Url is valid
   * @param url The Url to validate
   */
  static isSwiftPackageUrlValid(url: string): boolean {
    // Swift Package Url must start with "http" or "git"
    return url.startsWith("http") || url.startsWith("git");
  }

  /**
   * Retrieve Swift Package Metadata for Swift Package Url, if available
   * @param swiftPackageUrl The Swift Package Url
   */
  static async getSwiftPackageMetadata(swiftPackageUrl: string): Promise<XcodeSwiftPackageMetadata | null> {
    // Initialize URL
    const url = new URL(swiftPackageUrl);
    // Check if host is GitHub
    if (url.host === "github.com") {
      // Fetch GitHub Repository details
      const gitHubAPIResponse = await fetch(
        Path.join("https://api.github.com/repos", url.pathname.replace(".git", ""))
      );
      // Retrieve GitHub Repository from response
      const gitHubRepository = (await gitHubAPIResponse.json()) as any;
      // Return Metadata
      return {
        name: gitHubRepository.name,
        description: gitHubRepository.description,
        starsCount: gitHubRepository.stargazers_count,
        license: gitHubRepository.license?.name,
      };
    }
    // Otherwise return null
    return null;
  }

  /**
   * Add Swift Package from an Url to a XcodeProject
   * @param url The Swift Package Url
   * @param xcodeProjectFilePath The file path of the Xcode project where the Swift Package should be added
   */
  static async addSwiftPackage(url: string, xcodeProjectFilePath: string): Promise<void> {
    // Open Xcode Project
    await runAppleScript([
      'tell application "Finder"',
      // Open Xcode Project
      `open "${xcodeProjectFilePath}" as POSIX file`,
      // Add a slight delay before exiting the AppleScript
      // to ensure Xcode application process is launched
      "delay 0.1",
      "end tell",
    ]);
    // Wait until Xcode Project has been opened
    // by performing a Promise race where either:
    // - A 20-second timeout triggers which rejects with an error
    // - The AppleScript finishes as the Xcode Project was successfully opened
    await Promise.race([
      new Promise((resolve, reject) => {
        setTimeout(() => reject("Waiting for Xcode Project to be opened timed out"), 20000);
      }),
      runAppleScript([
        "repeat",
        'tell application "Xcode"',
        // Initialize all opened Xcode Project paths
        "set openedXcodeProjectPaths to path of workspace documents",
        // For each opened Xcode Project path
        "repeat with openedXcodeProjectPath in openedXcodeProjectPaths",
        // Check if Xcode Project is opened by evaluating:
        // if the file path of the Xcode Project starts with the opened Xcode Project path
        // a "starts with" operator is used as "Swift Package" Projects
        // doesn't contain a "Package.swift" file extension in the path
        `if "${xcodeProjectFilePath}" starts with openedXcodeProjectPath`,
        // Xcode Project is opened, return out of AppleScript
        "return",
        "end if",
        "end repeat",
        "end tell",
        "end repeat",
      ]),
    ]);
    // Add Swift Package from URL
    await runAppleScript([
      // Activate Xcode to ensure it's the front-most application
      'tell application "Xcode"',
      "activate",
      "end tell",
      // Click File -> Add Packages... -> CMD+F -> Enter Url -> Hit Enter
      'tell application "System Events"',
      // Click "Add Packages..." menu item
      [
        "click",
        '(menu item 1 where its name starts with "Add Package Dependencies")',
        "of menu 1",
        'of menu bar item "File"',
        "of menu bar 1",
        'of application process "Xcode"',
      ].join(" "),
      // Focus search bar using cmd+f keystroke
      "key code 3 using {command down}",
      // Enter URL
      `keystroke ("${url}" as string)`,
      // Hit Enter to load details
      "key code 36",
      "end tell",
    ]);
  }
}
