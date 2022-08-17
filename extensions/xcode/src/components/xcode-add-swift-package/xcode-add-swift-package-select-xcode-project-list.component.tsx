import { XcodeProject } from "../../models/xcode-project/xcode-project.model";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { XcodeProjectService } from "../../services/xcode-project.service";
import { List } from "@raycast/api";
import { XcodeProjectType } from "../../models/xcode-project/xcode-project-type.model";
import { XcodeAddSwiftPackageSelectXcodeProjectListItem } from "./xcode-add-swift-package-select-xcode-project-list-item.component";

/**
 * Xcode add Swift Package - Select Xcode Project List
 */
export function XcodeAddSwiftPackageSelectXcodeProjectList(props: {
  onSelect: (xcodeProject: XcodeProject) => void;
}): JSX.Element {
  // Use cached promise of XcodeProjectService XcodeProjects
  const xcodeProjectsState = useCachedPromise(XcodeProjectService.xcodeProjects);
  // Use promise of XcodeProjectService opened XcodeProjects
  const openedXcodeProjectsState = usePromise(XcodeProjectService.openedXcodeProjects);
  // Initialize valid Xcode Project Type filter predicate
  const validXcodeProjectTypeFilterPredicate = (xcodeProject: XcodeProject) => {
    // Only allow project and workspace types as those types supporting in adding new Swift Packages
    return xcodeProject.type === XcodeProjectType.project || xcodeProject.type === XcodeProjectType.workspace;
  };
  // Initialize opened XcodeProjects
  const openedXcodeProjects = openedXcodeProjectsState.data?.filter(validXcodeProjectTypeFilterPredicate);
  // Initialize XcodeProjects
  const xcodeProjects = xcodeProjectsState.data
    ?.filter(validXcodeProjectTypeFilterPredicate)
    .filter((xcodeProject) => !openedXcodeProjects?.map((project) => project.filePath).includes(xcodeProject.filePath));
  return (
    <List
      navigationTitle="Select Xcode Project"
      isLoading={xcodeProjectsState.isLoading || openedXcodeProjectsState.isLoading}
      searchBarPlaceholder="Select the Xcode Project where the Swift Package should be added"
    >
      <List.Section title="Opened Projects">
        {openedXcodeProjects?.map((xcodeProject) => {
          return (
            <XcodeAddSwiftPackageSelectXcodeProjectListItem
              key={xcodeProject.filePath}
              project={xcodeProject}
              onSelect={() => {
                props.onSelect(xcodeProject);
              }}
            />
          );
        })}
      </List.Section>
      <List.Section title={openedXcodeProjects?.length ? "All Projects" : undefined}>
        {xcodeProjects?.map((xcodeProject) => {
          return (
            <XcodeAddSwiftPackageSelectXcodeProjectListItem
              key={xcodeProject.filePath}
              project={xcodeProject}
              onSelect={() => {
                props.onSelect(xcodeProject);
              }}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
