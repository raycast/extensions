import { XcodeProject } from "../../models/project/xcode-project.model";
import { List } from "@raycast/api";
import { xcodeProjectListItem } from "./xcode-project-list-item.user-interface";

/**
 * Xcode Project List
 * @param xcodeProjects The optional XcodeProjects that should be shown in the list
 */
export function xcodeProjectList(xcodeProjects: XcodeProject[] | undefined): JSX.Element {
  return (
    <List isLoading={!xcodeProjects} searchBarPlaceholder={"Search for Xcode Projects or Swift Packages"}>
      {xcodeProjects?.map((xcodeProject) => xcodeProjectListItem(xcodeProject))}
    </List>
  );
}
