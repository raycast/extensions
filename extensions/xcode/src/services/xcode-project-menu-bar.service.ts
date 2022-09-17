import { XcodeProject } from "../models/xcode-project/xcode-project.model";
import { XcodeProjectService } from "./xcode-project.service";
import { getPreferences } from "../shared/get-preferences";
import { XcodeProjectType } from "../models/xcode-project/xcode-project-type.model";

/**
 * XcodeProjectMenuBarService
 */
export class XcodeProjectMenuBarService {
  /**
   * The Xcode Projects that should be shown in the Menu Bar
   */
  static async xcodeProjects(): Promise<XcodeProject[]> {
    // Retrieve XcodeProjects
    let xcodeProjects = await XcodeProjectService.xcodeProjects();
    // Retrieve Preferences
    const preferences = getPreferences();
    // Filter XcodeProjects by type
    xcodeProjects = xcodeProjects.filter((project) => {
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
    // Convert projects limit from preferences to a number
    const projectsLimit = Number(preferences.showRecentProjectsInMenuBar_projectsLimit) ?? 10;
    // Check if a projects limit is greater zero
    // Note: a negative limit represents no limit (all projects visible)
    if (projectsLimit > 0) {
      // Slice the XcodeProjects
      xcodeProjects = xcodeProjects.slice(0, projectsLimit);
    }
    return xcodeProjects;
  }
}
