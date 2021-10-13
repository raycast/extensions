import { XcodeProject } from "../models/xcode-project.model";
import { List } from "@raycast/api";
import { xcodeProjectListItem } from "./xcode-project-list-item.user-interface";

/**
 * Xcode Project List
 * @param xcodeProjects The optional XcodeProjects that should be shown in the list
 */
export function xcodeProjectList(
  xcodeProjects: XcodeProject[] | undefined
): JSX.Element {
  return (
    <List
      isLoading={!xcodeProjects}
      searchBarPlaceholder="Search Xcode projects...">
      {xcodeProjects?.map(xcodeProjectListItem)}
    </List>
  );
}
