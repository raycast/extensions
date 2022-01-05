import { ActionPanel, List, showToast, ToastStyle } from "@raycast/api";
import { XcodeProjectService } from "../../services/xcode-project.service";
import { useEffect, useState } from "react";
import { XcodeProject } from "../../models/project/xcode-project.model";
import { xcodeProjectListItem } from "../xcode-projects/xcode-project-list-item.user-interface";
import { XcodeProjectType } from "../../models/project/xcode-project-type.model";

/**
 * Xcode Add Swift Package Select XcodeProject
 * @param props The properties
 */
export function XcodeAddSwiftPackageSelectXcodeProject(props: {
  onSelect: (xcodeProject: XcodeProject) => void;
}): JSX.Element {
  // Initialize XcodeProjectService
  const xcodeProjectService = new XcodeProjectService();
  // Use opened XcodeProjects State
  const [openedXcodeProjects, setOpenedXcodeProjects] = useState<XcodeProject[] | undefined>(undefined);
  // Use XcodeProjects State
  const [xcodeProjects, setXcodeProjects] = useState<XcodeProject[] | undefined>(undefined);
  // Use Effect to retrieve the XcodeProjects
  useEffect(() => {
    // Retrieve opened XcodeProjects
    xcodeProjectService
      .openedXcodeProjects()
      .catch(() => undefined)
      .then(setOpenedXcodeProjects);
    // Retrieve cached XcodeProjects
    xcodeProjectService
      .cachedXcodeProjects()
      .then((cachedXcodeProjects) => {
        // Check if no XcodeProjects have been set
        if (!xcodeProjects) {
          // Set cached XcodeProjects
          setXcodeProjects(cachedXcodeProjects);
        }
      })
      .catch(console.error);
    // Retrieve most recent XcodeProjects
    xcodeProjectService
      .xcodeProjects()
      .then(setXcodeProjects)
      .catch(() => {
        // Check if no XcodeProjects have been set
        if (!xcodeProjects) {
          // Set empty XcodeProjects
          setXcodeProjects([]);
        }
      });
  }, []);
  // Initialize select Action provider
  const selectActionProvider = (xcodeProject: XcodeProject) => {
    return (
      <ActionPanel.Item
        title="Add Swift Package"
        onAction={() => {
          // Check if XcodeProject is a Swift Playground
          if (xcodeProject.type === XcodeProjectType.swiftPlayground) {
            // Show Toast
            showToast(ToastStyle.Failure, "Swift Package can not be added to a Swift Playground");
          } else {
            // Invoke onSelect with XcodeProject
            props.onSelect(xcodeProject);
          }
        }}
      />
    );
  };
  // Return XcodeProject List
  return (
    <List
      navigationTitle="Select Xcode Project"
      isLoading={!xcodeProjects}
      searchBarPlaceholder="Select the Xcode Project where the Swift Package should be added"
    >
      <List.Section title="Opened Projects">
        {openedXcodeProjects?.map((xcodeProject) => {
          return xcodeProjectListItem(xcodeProject, selectActionProvider);
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
            // Otherwise filter out XcodeProjects
            // which are already included in the opened XcodeProjects
            return !openedXcodeProjects.map((project) => project.filePath).includes(xcodeProject.filePath);
          })
          ?.map((xcodeProject) => {
            return xcodeProjectListItem(xcodeProject, selectActionProvider);
          })}
      </List.Section>
    </List>
  );
}
