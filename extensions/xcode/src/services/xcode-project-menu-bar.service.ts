import { XcodeProject } from "../models/xcode-project/xcode-project.model";
import { XcodeProjectService } from "./xcode-project.service";
import { XcodeProjectType } from "../models/xcode-project/xcode-project-type.model";
import { XcodeProjectFavoriteService } from "./xcode-project-favorite.service";
import { XcodeProjectsMenuBarList } from "../models/xcode-projects-menu-bar/xcode-projects-menu-bar-list.model";
import { showRecentProjectsInMenuBarCommandPreferences } from "../shared/preferences";

/**
 * XcodeProjectMenuBarService
 */
export class XcodeProjectMenuBarService {
  /**
   * The Xcode Projects Menu Bar List that should be shown in the Menu Bar
   */
  static async list(): Promise<XcodeProjectsMenuBarList> {
    // Retrieve XcodeProjects
    const xcodeProjects = await XcodeProjectService.xcodeProjects();
    // Retrieve Preferences
    const preferences = showRecentProjectsInMenuBarCommandPreferences;
    // Filter XcodeProjects by type
    let recentXcodeProjects = xcodeProjects.filter((project) => {
      // Switch on XcodeProjectType to decide
      // whether the project should be shown or not
      switch (project.type) {
        case XcodeProjectType.project:
          return preferences.showRecentProjectsInMenuBar_showXcodeProjects;
        case XcodeProjectType.workspace:
          return preferences.showRecentProjectsInMenuBar_showXcodeWorkspaces;
        case XcodeProjectType.swiftPackage:
          return preferences.showRecentProjectsInMenuBar_showSwiftPackages;
        case XcodeProjectType.swiftPlayground:
          return preferences.showRecentProjectsInMenuBar_showSwiftPlaygrounds;
      }
    });
    // Initialize favorite XcodeProjects
    let favoriteXcodeProjects: XcodeProject[] = [];
    // Check if favorites should be shown
    if (preferences.showRecentProjectsInMenuBar_showFavorites) {
      // Retrieve favorite XcodeProject Paths
      const favoriteXcodeProjectPaths = await XcodeProjectFavoriteService.favorites();
      // Re-Initialize favorite XcodeProjects
      favoriteXcodeProjects = xcodeProjects.filter((xcodeProject) =>
        favoriteXcodeProjectPaths.includes(xcodeProject.filePath)
      );
    }
    // Filter out recent XcodeProjects which are already included in the favorite XcodeProjects
    recentXcodeProjects = recentXcodeProjects.filter(
      (recentXcodeProject) => !favoriteXcodeProjects.includes(recentXcodeProject)
    );
    // Convert projects limit from preferences to a number
    const projectsLimit = Number(preferences.showRecentProjectsInMenuBar_projectsLimit) ?? 10;
    // Check if a projects limit is greater zero
    // Note: a negative limit represents no limit (all projects visible)
    if (projectsLimit > 0) {
      // Slice the XcodeProjects
      recentXcodeProjects = recentXcodeProjects.slice(0, projectsLimit);
    }
    // Return list
    return {
      favoriteXcodeProjects: favoriteXcodeProjects,
      recentXcodeProjects: recentXcodeProjects,
    };
  }
}
