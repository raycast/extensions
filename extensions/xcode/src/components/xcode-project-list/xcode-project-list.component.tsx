import { List } from "@raycast/api";
import { XcodeProjectListItem } from "./xcode-project-list-item.component";
import { useCachedPromise } from "@raycast/utils";
import { XcodeProjectService } from "../../services/xcode-project.service";
import { useState } from "react";
import { XcodeProjectType } from "../../models/xcode-project/xcode-project-type.model";
import { XcodeProjectListSearchBarAccessory } from "./xcode-project-list-search-bar-accessory.component";
import { XcodeProjectFavoriteService } from "../../services/xcode-project-favorite.service";

/**
 * Xcode Project List
 */
export function XcodeProjectList(): JSX.Element {
  // Use cached promise of XcodeProjectService XcodeProjects
  const xcodeProjectsState = useCachedPromise(XcodeProjectService.xcodeProjects);
  // Use cached promise of XcodeProjectFavoriteService Favorites
  const favoriteXcodeProjectsState = useCachedPromise(XcodeProjectFavoriteService.favorites);
  // Use state for ProjectTypeFilter
  const [projectTypeFilter, setProjectTypeFilter] = useState<XcodeProjectType | undefined>(undefined);
  // Initialize XcodeProjectsState Data which only includes XcodeProjects
  // that matches with the selected project type filter, if available
  const xcodeProjectsStateData = xcodeProjectsState.data?.filter((xcodeProject) =>
    projectTypeFilter ? xcodeProject.type === projectTypeFilter : true
  );
  // Initialize favorite XcodeProjects
  const favoriteXcodeProjects = xcodeProjectsStateData?.filter((xcodeProject) =>
    favoriteXcodeProjectsState.data?.includes(xcodeProject.filePath)
  );
  // Initialize default (non-favorite) XcodeProjects
  const xcodeProjects = xcodeProjectsStateData?.filter(
    (xcodeProject) => !favoriteXcodeProjectsState.data?.includes(xcodeProject.filePath)
  );
  return (
    <List
      isLoading={xcodeProjectsState.isLoading}
      searchBarPlaceholder="Search for Xcode Projects or Swift Packages"
      searchBarAccessory={
        <XcodeProjectListSearchBarAccessory key="search-bar-accessory" onChange={setProjectTypeFilter} />
      }
    >
      <List.Section title="Favorites">
        {favoriteXcodeProjects?.map((xcodeProject) => {
          return (
            <XcodeProjectListItem
              key={xcodeProject.filePath}
              project={xcodeProject}
              isFavorite={true}
              onToggleFavoriteAction={async () => {
                // Remove from favorites
                await XcodeProjectFavoriteService.removeFromFavorites(xcodeProject);
                // Revalidate favorite XcodeProjects state
                favoriteXcodeProjectsState.revalidate();
              }}
            />
          );
        })}
      </List.Section>
      <List.Section title={favoriteXcodeProjects?.length ? "Recent Projects" : undefined}>
        {xcodeProjects?.map((xcodeProject) => {
          return (
            <XcodeProjectListItem
              key={xcodeProject.filePath}
              project={xcodeProject}
              isFavorite={false}
              onToggleFavoriteAction={async () => {
                // Add to favorites
                await XcodeProjectFavoriteService.addToFavorites(xcodeProject);
                // Revalidate favorite XcodeProjects state
                favoriteXcodeProjectsState.revalidate();
              }}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
