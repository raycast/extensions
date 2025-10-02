import { ProToolsSession } from "../models/pro-tools-session.model";
import { execAsync, defaultExecOptions } from "../shared/exec-async";
import * as Path from "path";
import * as fs from "fs";
import { getPreferences } from "../shared/get-preferences";
import untildify from "untildify";

export class ProToolsSessionService {
  static async proToolsSessions(): Promise<ProToolsSession[]> {
    try {
      // Get user preferences
      const preferences = getPreferences();
      const showProToolsTemplates = preferences.showProToolsTemplates;
      const excludedProToolsSessionPaths =
        ProToolsSessionService.excludedProToolsSessionPaths();

      // Get search directory from preferences (if specified)
      let searchPath = "";
      if (preferences.searchDirectory) {
        searchPath = untildify(preferences.searchDirectory.trim());
        // Ensure the directory exists
        if (!fs.existsSync(searchPath)) {
          console.error(`Search directory does not exist: ${searchPath}`);
          searchPath = ""; // Fall back to searching everywhere
        }
      }

      let filePaths: string[] = [];

      // Use mdfind for all searches (both directory-specific and system-wide)
      console.log("Searching for Pro Tools sessions...");

      // Build the mdfind commands
      let ptxCommand = `mdfind "kMDItemDisplayName == *.ptx"`;
      let ptfCommand = `mdfind "kMDItemDisplayName == *.ptf"`;

      // If search directory is specified, limit the search to that directory
      if (searchPath) {
        console.log(`Limiting search to directory: ${searchPath}`);
        ptxCommand = `mdfind -onlyin "${searchPath}" "kMDItemDisplayName == *.ptx"`;
        ptfCommand = `mdfind -onlyin "${searchPath}" "kMDItemDisplayName == *.ptf"`;
      }

      // Execute the searches
      const ptxResult = await execAsync(ptxCommand, defaultExecOptions);
      const ptfResult = await execAsync(ptfCommand, defaultExecOptions);

      // Get the results
      const ptxFiles = ptxResult.stdout.split("\n").filter(Boolean);
      const ptfFiles = ptfResult.stdout.split("\n").filter(Boolean);

      // Combine results
      filePaths = [...ptxFiles, ...ptfFiles];
      console.log(
        `Found ${filePaths.length} Pro Tools files (${ptxFiles.length} PTX, ${ptfFiles.length} PTF)`
      );

      // If no files found, log a message
      if (filePaths.length === 0) {
        if (searchPath) {
          console.log(`No Pro Tools sessions found in ${searchPath}`);
        } else {
          console.log("No Pro Tools sessions found on this system");
        }
      }

      // Process the files to filter out unwanted ones and get the most recent
      console.log("Processing files...");

      // Filter out backup files and excluded paths
      const filteredFiles = filePaths.filter((file) => {
        // Skip files in "Session File Backups" directories
        if (file.includes("/Session File Backups/")) return false;

        // Skip files in Backup directories
        if (file.split("/").some((part) => part === "Backup")) return false;

        // Skip excluded paths
        if (
          excludedProToolsSessionPaths.some((excludedPath) =>
            file.startsWith(excludedPath)
          )
        )
          return false;

        // Skip templates if needed
        if (
          !showProToolsTemplates &&
          file.split("/").some((part) => part === "Templates")
        )
          return false;

        return true;
      });

      console.log(`After filtering: ${filteredFiles.length} files remain`);

      // Get modification times for all files
      console.log("Getting modification times for all files...");
      const fileStats = filteredFiles
        .map((file) => {
          try {
            const stats = fs.statSync(file);
            return { path: file, mtime: stats.mtime.getTime() };
          } catch (e) {
            console.log(`Error accessing file: ${file}`, e);
            return null;
          }
        })
        .filter(
          (item): item is { path: string; mtime: number } => item !== null
        );

      // Sort by modification time (newest first) and take the 100 most recent
      fileStats.sort((a, b) => b.mtime - a.mtime);
      const recentFiles = fileStats.slice(0, 100);

      console.log(
        `Final result: ${recentFiles.length} recent Pro Tools sessions`
      );

      // Process files to create session objects
      const proToolsSessions: ProToolsSession[] = [];

      // Create the session objects directly from the sorted fileStats array
      // This preserves the exact same order as the sorted files
      for (const fileStat of recentFiles) {
        // Skip if file doesn't exist (could have been deleted since search)
        if (!fs.existsSync(fileStat.path)) continue;

        // Decode and add the session with its exact modification time
        const session = ProToolsSessionService.decodeProToolsSession(
          fileStat.path,
          fileStat.mtime
        );
        if (session) {
          proToolsSessions.push(session);
        }
      }

      // Return the 100 most recent sessions
      return proToolsSessions.slice(0, 100);
    } catch (error) {
      console.error("Error finding Pro Tools sessions:", error);
      return [];
    }
  }

  private static decodeProToolsSession(
    filePath: string,
    cachedModTime?: number
  ): ProToolsSession | undefined {
    // Check if the file has a .ptx or .ptf extension
    const isPtx = filePath.endsWith(".ptx");
    const isPtf = filePath.endsWith(".ptf");

    if (!isPtx && !isPtf) {
      return undefined;
    }

    const fileExtension = isPtx ? ".ptx" : ".ptf";
    const lastSlashIndex = filePath.lastIndexOf("/");

    // Get the full file name including extension
    const fullFileName = filePath.substring(lastSlashIndex + 1);

    // Get the name without extension for backward compatibility
    const name = filePath.substring(
      lastSlashIndex + 1,
      filePath.length - fileExtension.length
    );

    // Use cached modification time if available, otherwise get it from the file
    let modifiedDate: Date;
    if (cachedModTime !== undefined) {
      // Use the cached modification time
      modifiedDate = new Date(cachedModTime);
    } else {
      // Get modifiedDate property for file at specified filePath
      const stats = fs.statSync(filePath);
      modifiedDate = stats.mtime;
    }

    // Get the directory path
    const directoryPath = Path.dirname(filePath);

    // Get relative path if search directory is specified
    let relativePath = filePath;
    const searchDirectory = getPreferences().searchDirectory;
    if (searchDirectory) {
      const expandedSearchDir = untildify(searchDirectory.trim());
      if (filePath.startsWith(expandedSearchDir)) {
        relativePath = filePath.substring(expandedSearchDir.length);
        // Remove leading slash if present
        if (relativePath.startsWith("/")) {
          relativePath = relativePath.substring(1);
        }
      }
    }

    // Initialize keywords
    let keywords = filePath.split("/");
    // Pop last element of keywords
    keywords.pop();
    // Push name to keywords
    keywords.push(name);
    // Filter out duplicates and empty keywords
    keywords = [...new Set(keywords.filter(Boolean))];

    return {
      name: fullFileName, // Use full file name including extension
      directoryPath: directoryPath,
      modifiedDate: modifiedDate,
      filePath: filePath,
      relativePath: relativePath, // Add relative path
      keywords: keywords.reverse(),
    };
  }

  private static excludedProToolsSessionPaths(): string[] {
    const excludedProToolsSessionPathsString =
      getPreferences().excludedProToolsSessionPaths;

    if (!excludedProToolsSessionPathsString) {
      return [];
    }

    return (
      excludedProToolsSessionPathsString
        // Split by comma
        .split(",")
        // Trim each path
        .map((path) => path.trim())
        // Untildify each path
        .map((path) => untildify(path))
    );
  }
}
