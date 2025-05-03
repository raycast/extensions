import { List } from "@raycast/api";
import { XcodeProjectListItem } from "./xcode-project-list-item.component";
import { useCachedPromise } from "@raycast/utils";
import { XcodeProjectService } from "../../services/xcode-project.service";
import { JSX, useState } from "react";
import { XcodeProjectType } from "../../models/xcode-project/xcode-project-type.model";
import { XcodeProjectListSearchBarAccessory } from "./xcode-project-list-search-bar-accessory.component";
import { XcodeProjectFavoriteService } from "../../services/xcode-project-favorite.service";
import { XcodeProject } from "../../models/xcode-project/xcode-project.model";

/**
 * Xcode Project List
 */
export function XcodeProjectList(props: {
  navigationTitle?: string;
  searchBarPlaceholder?: string;
  storeDropdownFilterValue?: boolean;
  projectTypeFilter?: (xcodeProjectType: XcodeProjectType) => boolean;
  actions?: (xcodeProject: XcodeProject) => [JSX.Element];
}) {
  // Use cached promise of XcodeProjectService XcodeProjects
  const xcodeProjectsState = useCachedPromise(XcodeProjectService.xcodeProjects);
  // Use cached promise of XcodeProjectFavoriteService Favorites
  const favoriteXcodeProjectsState = useCachedPromise(XcodeProjectFavoriteService.favorites);
  // Use state for ProjectTypeFilter
  const [projectTypeFilter, setProjectTypeFilter] = useState<XcodeProjectType | undefined>(undefined);
  // Initialize XcodeProjectsState Data which only includes XcodeProjects
  // that matches with the selected project type filter, if available
  const xcodeProjectsStateData = xcodeProjectsState.data?.filter((xcodeProject) =>
    projectTypeFilter
      ? xcodeProject.type === projectTypeFilter
      : props.projectTypeFilter
      ? props.projectTypeFilter(xcodeProject.type)
      : true
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
      navigationTitle={props.navigationTitle}
      isLoading={xcodeProjectsState.isLoading}
      searchBarPlaceholder={props.searchBarPlaceholder ?? "Search for Xcode Projects or Swift Packages"}
      searchBarAccessory={
        <XcodeProjectListSearchBarAccessory
          key="search-bar-accessory"
          projectTypeFilter={props.projectTypeFilter}
          storeDropdownFilterValue={props.storeDropdownFilterValue}
          onChange={setProjectTypeFilter}
        />
      }
      filtering={{ keepSectionOrder: true }}
    >
      <List.Section title="Favorites">
        {favoriteXcodeProjects?.map((xcodeProject) => (
          <XcodeProjectListItemContainer
            key={xcodeProject.filePath}
            xcodeProject={xcodeProject}
            isFavorite={true}
            actions={props.actions}
            revalidate={favoriteXcodeProjectsState.revalidate}
          />
        ))}
      </List.Section>
      <List.Section title={favoriteXcodeProjects?.length ? "Recent Projects" : undefined}>
        {xcodeProjects?.map((xcodeProject) => (
          <XcodeProjectListItemContainer
            key={xcodeProject.filePath}
            xcodeProject={xcodeProject}
            isFavorite={false}
            actions={props.actions}
            revalidate={favoriteXcodeProjectsState.revalidate}
          />
        ))}
      </List.Section>
    </List>
  );
}

/**
 * Xcode Project List Item Container
 */
function XcodeProjectListItemContainer(props: {
  xcodeProject: XcodeProject;
  isFavorite: boolean;
  actions?: (xcodeProject: XcodeProject) => [JSX.Element];
  revalidate: () => void;
}) {
  return (
    <XcodeProjectListItem
      project={props.xcodeProject}
      isFavorite={props.isFavorite}
      actions={props.actions ? props.actions(props.xcodeProject) : undefined}
      onToggleFavoriteAction={async () => {
        if (props.isFavorite) {
          // Remove from favorites
          await XcodeProjectFavoriteService.removeFromFavorites(props.xcodeProject);
        } else {
          // Add to favorites
          await XcodeProjectFavoriteService.addToFavorites(props.xcodeProject);
        }
        // Revalidate
        props.revalidate();
      }}
    />
  );
}
