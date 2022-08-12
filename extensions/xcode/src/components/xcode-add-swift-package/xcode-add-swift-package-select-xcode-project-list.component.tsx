import { XcodeProject } from "../../models/xcode-project/xcode-project.model";
import { useCachedPromise } from "@raycast/utils";
import { XcodeProjectService } from "../../services/xcode-project.service";
import { Action, ActionPanel, List } from "@raycast/api";
import { XcodeProjectType } from "../../models/xcode-project/xcode-project-type.model";
import { XcodeProjectListItem } from "../xcode-project-list/xcode-project-list-item.component";

/**
 * Xcode add Swift Package - Select Xcode Project List
 */
export function XcodeAddSwiftPackageSelectXcodeProjectList(props: {
  onSelect: (xcodeProject: XcodeProject) => void;
}): JSX.Element {
  const xcodeProjectsState = useCachedPromise(() => {
    return XcodeProjectService.xcodeProjects();
  });
  const openedXcodeProjectsState = useCachedPromise(() => {
    return XcodeProjectService.openedXcodeProjects();
  });
  const xcodeProjects = xcodeProjectsState.data?.filter(
    (xcodeProject) =>
      xcodeProject.type !== XcodeProjectType.swiftPackage && xcodeProject.type !== XcodeProjectType.swiftPlayground
  );
  const openedXcodeProjects = openedXcodeProjectsState.data?.filter(
    (xcodeProject) =>
      xcodeProject.type !== XcodeProjectType.swiftPackage && xcodeProject.type !== XcodeProjectType.swiftPlayground
  );
  // Initialize select Action provider
  const selectAction = (xcodeProject: XcodeProject) => {
    return (
      <ActionPanel>
        <Action
          title="Add Swift Package"
          onAction={() => {
            // Invoke onSelect with XcodeProject
            props.onSelect(xcodeProject);
          }}
        />
      </ActionPanel>
    );
  };
  return (
    <List
      navigationTitle="Select Xcode Project"
      isLoading={xcodeProjectsState.isLoading || openedXcodeProjectsState.isLoading}
      searchBarPlaceholder="Select the Xcode Project where the Swift Package should be added"
    >
      <List.Section title="Opened Projects">
        {openedXcodeProjects?.map((xcodeProject) => {
          return (
            <XcodeProjectListItem
              key={xcodeProject.filePath}
              project={xcodeProject}
              actions={selectAction(xcodeProject)}
            />
          );
        })}
      </List.Section>
      <List.Section title={(openedXcodeProjects ?? []).length > 0 ? "All Projects" : undefined}>
        {xcodeProjects
          ?.filter((xcodeProject) => {
            // Check if no opened XcodeProjects are available
            if (!openedXcodeProjects) {
              // Include any XcodeProject
              return true;
            }
            // Otherwise, filter out XcodeProjects
            // which are already included in the opened XcodeProjects
            return !openedXcodeProjects?.map((project) => project.filePath).includes(xcodeProject.filePath);
          })
          ?.map((xcodeProject) => {
            return (
              <XcodeProjectListItem
                key={xcodeProject.filePath}
                project={xcodeProject}
                actions={selectAction(xcodeProject)}
              />
            );
          })}
      </List.Section>
    </List>
  );
}
