import { XcodeProject } from "../models/xcode-project/xcode-project.model";
import { XcodeProjectType } from "../models/xcode-project/xcode-project-type.model";
import { execAsync } from "../shared/exec-async";
import untildify from "untildify";
import * as Path from "path";
import * as FS from "fs";
import * as OS from "os";
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
      `mdfind -attr kMDItemLastUsedDate '${spotlightSearchPatterns.join(" || ")}'`
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
      if (XcodeProjectService.isExcludedXcodeProjectPath(path, excludedXcodeProjectPaths)) {
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
    // Append Xcode projects located in git worktrees, which are typically
    // stored in hidden directories that are not indexed by Spotlight
    xcodeProjects.push(...XcodeProjectService.gitWorktreeXcodeProjects(xcodeProjects, excludedXcodeProjectPaths));
    // Sort Xcode projects by lastUsedDate (descending order).
    xcodeProjects.sort((lhs, rhs) => (rhs.lastUsed?.getTime() ?? 0) - (lhs.lastUsed?.getTime() ?? 0));
    // Return xcode projects
    return xcodeProjects;
  }

  /**
   * Returns a Boolean whether the Xcode Project path is excluded
   * @param path The Xcode Project path
   * @param excludedXcodeProjectPaths The excluded Xcode Project paths
   */
  private static isExcludedXcodeProjectPath(path: string, excludedXcodeProjectPaths: string[]): boolean {
    return (
      path.includes("/Carthage/Checkouts") ||
      path.includes("/Pods/") ||
      path.includes("/Library/Autosave Information") ||
      excludedXcodeProjectPaths.some((excludedPath) => path.startsWith(excludedPath))
    );
  }

  /**
   * Returns the Xcode Projects located in other git worktrees of the given Xcode Projects
   * which have not already been found.
   * @param xcodeProjects The Xcode Projects
   * @param excludedXcodeProjectPaths The excluded Xcode Project paths
   */
  private static gitWorktreeXcodeProjects(
    xcodeProjects: XcodeProject[],
    excludedXcodeProjectPaths: string[]
  ): XcodeProject[] {
    // Initialize the set of known Xcode Project file paths
    const knownFilePaths = new Set(xcodeProjects.map((xcodeProject) => xcodeProject.filePath));
    // Initialize the cache of git worktree paths by git common directory
    const worktreePathsCache = new Map<string, string[]>();
    // Initialize worktree Xcode Projects
    const worktreeXcodeProjects: XcodeProject[] = [];
    for (const xcodeProject of xcodeProjects) {
      // Retrieve the git repository containing the Xcode Project
      const repository = XcodeProjectService.gitRepository(xcodeProject.directoryPath);
      if (!repository) {
        continue;
      }
      // Retrieve the git worktree paths of the repository
      let worktreePaths = worktreePathsCache.get(repository.commonDirectory);
      if (!worktreePaths) {
        worktreePaths = XcodeProjectService.gitWorktreePaths(repository.commonDirectory);
        worktreePathsCache.set(repository.commonDirectory, worktreePaths);
      }
      // Initialize the Xcode Project path relative to the worktree root
      const relativeFilePath = Path.relative(repository.rootDirectory, xcodeProject.filePath);
      for (const worktreePath of worktreePaths) {
        // Initialize the Xcode Project path within the worktree
        const filePath = Path.join(worktreePath, relativeFilePath);
        if (
          knownFilePaths.has(filePath) ||
          XcodeProjectService.isExcludedXcodeProjectPath(filePath, excludedXcodeProjectPaths) ||
          !FS.existsSync(filePath)
        ) {
          continue;
        }
        knownFilePaths.add(filePath);
        // Use the Xcode user state as last used date
        // as Spotlight does not provide one for non-indexed paths
        const lastUsed = XcodeProjectService.xcodeUserStateDate(filePath, xcodeProject.type);
        // Skip worktree Xcode Projects which have never been opened in Xcode
        if (!lastUsed) {
          continue;
        }
        const worktreeXcodeProject = XcodeProjectService.decodeXcodeProject(filePath, lastUsed);
        if (worktreeXcodeProject) {
          worktreeXcodeProjects.push(worktreeXcodeProject);
        }
      }
    }
    return worktreeXcodeProjects;
  }

  /**
   * Returns the git repository root directory (worktree root) and common git directory
   * for the given directory, if any.
   * @param directory The directory
   */
  private static gitRepository(directory: string): { rootDirectory: string; commonDirectory: string } | undefined {
    for (let currentDirectory = directory; ; currentDirectory = Path.dirname(currentDirectory)) {
      const gitPath = Path.join(currentDirectory, ".git");
      try {
        const stats = FS.statSync(gitPath);
        if (stats.isDirectory()) {
          // Main worktree
          return { rootDirectory: currentDirectory, commonDirectory: gitPath };
        }
        // Linked worktree: .git file contains "gitdir: <path>"
        const gitDirectory = Path.resolve(
          currentDirectory,
          FS.readFileSync(gitPath, "utf8")
            .replace(/^gitdir:/, "")
            .trim()
        );
        // The commondir file points to the common git directory, relative to the git directory
        const commonDirectoryFile = Path.join(gitDirectory, "commondir");
        const commonDirectory = FS.existsSync(commonDirectoryFile)
          ? Path.resolve(gitDirectory, FS.readFileSync(commonDirectoryFile, "utf8").trim())
          : gitDirectory;
        return { rootDirectory: currentDirectory, commonDirectory: commonDirectory };
      } catch {
        // No .git entry in this directory
      }
      if (Path.dirname(currentDirectory) === currentDirectory) {
        return undefined;
      }
    }
  }

  /**
   * Returns the root paths of all worktrees of a git repository
   * @param commonDirectory The common git directory of the repository
   */
  private static gitWorktreePaths(commonDirectory: string): string[] {
    const worktreePaths: string[] = [];
    // The main worktree is the parent of the common .git directory (unless bare)
    if (Path.basename(commonDirectory) === ".git") {
      worktreePaths.push(Path.dirname(commonDirectory));
    }
    // Each linked worktree has a gitdir file pointing to "<worktree>/.git"
    const worktreesDirectory = Path.join(commonDirectory, "worktrees");
    try {
      for (const name of FS.readdirSync(worktreesDirectory)) {
        try {
          const gitFile = FS.readFileSync(Path.join(worktreesDirectory, name, "gitdir"), "utf8").trim();
          worktreePaths.push(Path.dirname(gitFile));
        } catch {
          // Ignore invalid worktree entry
        }
      }
    } catch {
      // No linked worktrees
    }
    return worktreePaths;
  }

  /**
   * Returns the date when Xcode last updated the user state of the Xcode Project, if available.
   * @param xcodeProjectPath The Xcode Project Path
   * @param type The Xcode Project type
   */
  private static xcodeUserStateDate(xcodeProjectPath: string, type: XcodeProjectType): Date | undefined {
    let workspacePath: string;
    switch (type) {
      case XcodeProjectType.project:
        workspacePath = Path.join(xcodeProjectPath, "project.xcworkspace");
        break;
      case XcodeProjectType.workspace:
        workspacePath = xcodeProjectPath;
        break;
      case XcodeProjectType.swiftPackage:
        workspacePath = Path.join(Path.dirname(xcodeProjectPath), ".swiftpm", "xcode", "package.xcworkspace");
        break;
      case XcodeProjectType.swiftPlayground:
        workspacePath = Path.join(xcodeProjectPath, "playground.xcworkspace");
        break;
      default:
        return undefined;
    }
    const userDataPath = Path.join(workspacePath, "xcuserdata", `${OS.userInfo().username}.xcuserdatad`);
    // Use the most recent modification date of the user data directory and its user interface state
    const modificationTimes = [userDataPath, Path.join(userDataPath, "UserInterfaceState.xcuserstate")].flatMap(
      (path) => {
        try {
          return [FS.statSync(path).mtimeMs];
        } catch {
          return [];
        }
      }
    );
    return modificationTimes.length ? new Date(Math.max(...modificationTimes)) : undefined;
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
