import { XcodeSwiftPackage } from "../models/swift-package/xcode-swift-package.model";
import { execAsync } from "../shared/exec-async";
import { XcodeSwiftPackageCreationParameters } from "../models/swift-package/xcode-swift-package-creation-parameters.model";
import { joinPathComponents } from "../shared/join-path-components";
import {XcodeProject} from "../models/project/xcode-project.model";
import {XcodeProjectService} from "./xcode-project.service";
import {XcodeAddSwiftPackageXcodeNotRunningError} from "../models/swift-package/xcode-add-swift-package-xcode-not-running-error.model";
import {closeMainWindow} from "@raycast/api";

/**
 * XcodeSwiftPackageService
 */
export class XcodeSwiftPackageService {

  /**
   * Create Swift Package from parameters
   */
  createSwiftPackage(
    parameters: XcodeSwiftPackageCreationParameters
  ): Promise<XcodeSwiftPackage> {
    // Initialize Swift Package path
    const swiftPackagePath = joinPathComponents(
      parameters.location,
      parameters.name
    );
    // Execute command
    return execAsync(
      [
        // Make directory
        `mkdir -p ${swiftPackagePath}`,
        // Switch to directory
        `cd ${swiftPackagePath}`,
        // Create Swift Package
        [
          "swift",
          "package",
          "init",
          "--name",
          parameters.name,
          "--type",
          parameters.type
        ].join(" ")
      ].join(" && ")
    ).then(() => {
      // Return Swift Package
      return {
        name: parameters.name,
        type: parameters.type,
        path: swiftPackagePath,
        open: () => {
          // Open Package.swift
          return execAsync(
            `open ${swiftPackagePath}/Package.swift`
          ).then();
        }
      };
    });
  }

  /**
   * Retrieve Swift Package Url from Clipboard, if available
   */
  getSwiftPackageUrlFromClipboard(): Promise<string | null> {
    return execAsync("pbpaste")
      .then(output => output.stdout.trim())
      .then(url => {
        // Check if URl starts with http or git
        if (url.startsWith("http") || url.startsWith("git")) {
          // Return url
          return url;
        } else {
          // Otherwise return null
          return null;
        }
      })
      .catch(() => null);
  }

  /**
   * Add Swift Package from URL
   * @param url The URL
   * @param xcodeProject The optional XcodeProject where the Swift Package should be added. Default value `null`
   */
  async addSwiftPackage(
    url: string,
    xcodeProject: XcodeProject | null = null
  ): Promise<XcodeProject[] | void> {
    // Check if a project path is available
    if (xcodeProject) {
      // Focus Xcode Project
      await AddSwiftPackageAppleScript.run(
        AddSwiftPackageAppleScript.focusXcodeProjectScript(xcodeProject)
      );
      // Wait until Xcode Project has been opened
      await AddSwiftPackageAppleScript.run(
        AddSwiftPackageAppleScript.waitUntilXcodeProjectOpenedScript(xcodeProject)
      );
      // Ensure to close the main Raycast window
      // to prevent wrong focus shift before trying to add Swift Package
      await closeMainWindow();
      // Add Swift Package from URL
      await AddSwiftPackageAppleScript.run(
        AddSwiftPackageAppleScript.addSwiftPackageScript(url)
      );
    } else {
      try {
        // Otherwise try to retrieve the currently opened Xcode project paths
        const openedXcodeProjectPathsResponse = await AddSwiftPackageAppleScript.run(
          AddSwiftPackageAppleScript.openedXcodeProjectPathsScript()
        );
        // Return opened XcodeProjects
        return openedXcodeProjectPathsResponse
          // Use standard output
          .stdout
          // Split by semicolon
          .split(",")
          // Trim each path
          .map(path => path.trim())
          // Decode Path as XcodeProject
          .map(XcodeProjectService.decodeXcodeProject)
          // Filter out falsy values
          .filter(xcodeProject => xcodeProject) as XcodeProject[]
      } catch {
        // Throw Xcode is not running Error
        throw new XcodeAddSwiftPackageXcodeNotRunningError();
      }
    }
  }

}

/**
 * Add Swift Package AppleScript
 */
class AddSwiftPackageAppleScript {

  /**
   * Run AppleScript
   * @param appleScript The AppleScript that should be executed
   */
  static run(
    appleScript: string[]
  ) {
    // Execute osascript command and pass each AppleScript line with a separate "-e" flag
    return execAsync(
      `osascript ${appleScript.map(line => `-e '${line}'`).join(" ")}`
    );
  }

  /**
   * Opened Xcode Project Paths AppleScript
   */
  static openedXcodeProjectPathsScript(): string[] {
    return [
      'tell application "Xcode"',
        'return path of workspace documents',
      'end tell'
    ];
  }

  /**
   * Focus Xcode Project AppleScript
   * @param xcodeProject The XcodeProject
   */
  static focusXcodeProjectScript(
    xcodeProject: XcodeProject
  ): string[] {
    return [
      'tell application "Finder"',
        `open "${xcodeProject.filePath}" as POSIX file`,
      'end tell',
    ];
  }

  /**
   * Wait until XcodeProject opened AppleScript
   * @param xcodeProject The XcodeProject
   */
  static waitUntilXcodeProjectOpenedScript(
    xcodeProject: XcodeProject
  ): string[] {
    return [
      'tell application "Xcode"',
        'repeat',
          'set openedXcodeProjectPaths to path of workspace documents',
          `if openedXcodeProjectPaths contains "${xcodeProject.filePath}" then`,
            'activate',
            'exit repeat',
          'end if',
          'delay 0.1',
        'end repeat',
      'end tell',
    ]
  }

  /**
   * Add Swift Package AppleScript
   * @param url The Swift Package URL
   */
  static addSwiftPackageScript(
    url: string
  ): string[] {
    return [
      // Activate Xcode to ensure it is the front-most application
      'tell application "Xcode"',
        'activate',
      'end tell',
      // Click File -> Add Packages... -> CMD+F -> Enter Url -> Hit Enter
      'tell application "System Events"',
        // Click "Add Packages..." menu item
        [
          'click',
          '(menu item 1 where its name starts with "Add Packages")',
          'of menu 1',
          'of menu bar item "File"',
          'of menu bar 1',
          'of application process "Xcode"'
        ].join(" "),
        // Focus search bar using cmd+f keystroke
        'key code 3 using {command down}',
        // Enter URL
        `keystroke ("${url}" as string)`,
        // Hit Enter
        'key code 36',
      'end tell'
    ];
  }

}
