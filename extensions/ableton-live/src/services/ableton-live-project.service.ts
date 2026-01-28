import { AbletonLiveProject } from "../models/ableton-live-project.model";
import { execAsync } from "../shared/exec-async";
import * as Path from "path";
import * as fs from "fs";
import { getPreferences } from "../shared/get-preferences";
import untildify from "untildify";

export class AbletonLiveProjectService {
  static async abletonLiveProjects(): Promise<AbletonLiveProject[]> {
    // Find all files with .als extension sorted by modifiedDate
    const output = await execAsync(
      `mdfind "kMDItemDisplayName == *.als" -0 | xargs -0 stat -f "%m %N" | sort -rn | cut -d ' ' -f 2-`
    );

    // Excluded directories list
    const excludedAbletonLiveProjectPaths = AbletonLiveProjectService.excludedAbletonLiveProjectPaths();

    // User preference if Ableton Live Templates should be shown
    const showAbletonLiveTemplates = getPreferences().showAbletonLiveTemplates;

    const abletonLiveProjects = output.stdout
      .split("\n")
      .filter(Boolean)

      // Filter out Backup Project files from Ableton Live Project
      .filter((abletonLiveProjectPath) => {
        const pathParts = abletonLiveProjectPath.split("/");

        if (pathParts.length > 2) {
          return pathParts[pathParts.length - 2] !== "Backup";
        } else {
          return true;
        }
      })

      // Filter out Ableton Live Projects that should be excluded based on the preferences
      .filter((filePath) => {
        return !excludedAbletonLiveProjectPaths.find((excludedPath) => filePath.startsWith(excludedPath));
      })

      // Filter out Ableton Live Templates according to the user preferences
      .filter((filePath) => {
        const pathParts = filePath.split("/");
        if (showAbletonLiveTemplates) {
          return true;
        } else {
          if (pathParts.length > 2) {
            return pathParts[pathParts.length - 2] !== "Templates";
          } else {
            return true;
          }
        }
      })
      .map((abletonLiveProjectPath) => AbletonLiveProjectService.decodeAbletonLiveProject(abletonLiveProjectPath))
      .filter(Boolean) as AbletonLiveProject[];
    return abletonLiveProjects;
  }

  private static decodeAbletonLiveProject(filePath: string): AbletonLiveProject | undefined {
    const fileExtension = ".als";
    const lastSlashIndex = filePath.lastIndexOf("/");
    const name = filePath.substring(lastSlashIndex + 1, filePath.length - fileExtension.length);

    // Get modifiedDate property for file at specified filePath
    const stats = fs.statSync(filePath);
    const modifiedDate = stats.mtime;

    // Initialize keywords
    let keywords = filePath.split("/");
    // Pop last element of keywords
    keywords.pop();
    // Push name to keywords
    keywords.push(name);
    // Filter out duplicates and empty keywords
    keywords = [...new Set(keywords.filter(Boolean))];

    return {
      name: name,
      directoryPath: Path.dirname(filePath),
      modifiedDate: modifiedDate,
      filePath: filePath,
      keywords: keywords.reverse(),
    };
  }

  private static excludedAbletonLiveProjectPaths(): string[] {
    const excludedAbletonLiveProjectPathsString = getPreferences().excludedAbletonLiveProjectPaths;

    if (!excludedAbletonLiveProjectPathsString) {
      return [];
    }

    return (
      excludedAbletonLiveProjectPathsString
        // Split by comma
        .split(",")
        // Trim each path
        .map((path) => path.trim())
        // Untildify each path
        .map((path) => untildify(path))
    );
  }
}
