/**
 * The Xcode Raycast Command Preferences
 */
export interface Preferences {
  /**
   * [show-recent-projects-in-menu-bar.command] - Projects Limit
   */
  showRecentProjectsInMenuBar_projectsLimit: string;
  /**
   * [show-recent-projects-in-menu-bar.command] - Show Favorites
   */
  showRecentProjectsInMenuBar_showFavorites: boolean;
  /**
   * [show-recent-projects-in-menu-bar.command] - Show Xcode Projects
   */
  showRecentProjectsInMenuBar_showXcodeProjects: boolean;
  /**
   * [show-recent-projects-in-menu-bar.command] - Show Xcode Workspaces
   */
  showRecentProjectsInMenuBar_showXcodeWorkspaces: boolean;
  /**
   * [show-recent-projects-in-menu-bar.command] - Show Swift Packages
   */
  showRecentProjectsInMenuBar_showSwiftPackages: boolean;
  /**
   * [show-recent-projects-in-menu-bar.command] - Show Swift Playgrounds
   */
  showRecentProjectsInMenuBar_showSwiftPlaygrounds: boolean;
  /**
   * [search-recent-projects.command] - Excluded Xcode Project Paths
   */
  excludedXcodeProjectPaths?: string;
  /**
   * [create-swift-playground.command] - Default Playground Location
   */
  playgroundDefaultLocation: string;
}
