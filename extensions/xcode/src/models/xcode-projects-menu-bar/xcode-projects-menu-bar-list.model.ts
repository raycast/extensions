import { XcodeProject } from "../xcode-project/xcode-project.model";

/**
 * A Xcode Projects Menu Bar List
 */
export interface XcodeProjectsMenuBarList {
  /**
   * Favorite Xcode Projects
   */
  favoriteXcodeProjects: XcodeProject[];
  /**
   * Recent Xcode Projects
   */
  recentXcodeProjects: XcodeProject[];
}
