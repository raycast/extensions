import { XcodeProject } from "../../models/project/xcode-project.model";
import {ActionPanelChildren, List} from "@raycast/api";
import { xcodeProjectListItem } from "./xcode-project-list-item.user-interface";

/**
 * Xcode Project List
 * @param xcodeProjects The optional XcodeProjects that should be shown in the list
 * @param searchBarPlaceholder The search bar placeholder. Default value `Search for Xcode Projects or Swift Packages`
 * @param customActionsProvider The optional custom XcodeProject actions provider. Default value `null`
 */
export function xcodeProjectList(
  xcodeProjects: XcodeProject[] | undefined,
  searchBarPlaceholder = "Search for Xcode Projects or Swift Packages",
  customActionsProvider: ((xcodeProject: XcodeProject) => ActionPanelChildren) | null = null
): JSX.Element {
  return (
    <List
      isLoading={!xcodeProjects}
      searchBarPlaceholder={searchBarPlaceholder}>
      {xcodeProjects?.map(xcodeProject => xcodeProjectListItem(xcodeProject, customActionsProvider))}
    </List>
  );
}
