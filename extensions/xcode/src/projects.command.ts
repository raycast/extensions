import { showToast, ToastStyle } from "@raycast/api";
import { useEffect, useState } from "react";
import { XcodeProject } from "./models/project/xcode-project.model";
import { xcodeProjectList } from "./user-interfaces/xcode-projects/xcode-project-list.user-interface";
import { XcodeProjectService } from "./services/xcode-project.service";

/**
 * Xcode projects command
 */
export default () => {
  // Initialize XcodeProjectService
  const xcodeProjectService = new XcodeProjectService();
  // Use XcodeProject State
  const [xcodeProjects, setXcodeProjects] = useState<XcodeProject[] | undefined>(undefined);
  // Use Effect
  useEffect(() => {
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
      .catch((error) => {
        // Check if no XcodeProjects have been set
        if (!xcodeProjects) {
          // Set empty XcodeProjects
          setXcodeProjects([]);
        }
        // Log Error
        console.error(error);
        // Show Toast
        return showToast(ToastStyle.Failure, "An error occurred while finding Xcode Projects", error);
      });
  }, []);
  // Return XcodeProject List
  return xcodeProjectList(xcodeProjects);
};
