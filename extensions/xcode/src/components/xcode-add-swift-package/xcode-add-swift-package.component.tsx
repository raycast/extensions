import { XcodeProjectType } from "../../models/xcode-project/xcode-project-type.model";
import { Action, closeMainWindow, Icon, Navigation, showHUD, showToast, Toast, useNavigation } from "@raycast/api";
import { XcodeProjectList } from "../xcode-project-list/xcode-project-list.component";
import { XcodeProject } from "../../models/xcode-project/xcode-project.model";
import { XcodeSwiftPackageService } from "../../services/xcode-swift-package.service";
import { XcodeService } from "../../services/xcode.service";

/**
 * Xcode Add Swift Package
 */
export function XcodeAddSwiftPackage(props: { url: string }) {
  const navigation = useNavigation();
  return (
    <XcodeProjectList
      navigationTitle="Select Xcode Project"
      searchBarPlaceholder="Select Xcode Project"
      projectTypeFilter={(projectType) =>
        projectType === XcodeProjectType.project || projectType === XcodeProjectType.workspace
      }
      actions={(xcodeProject) => [
        <Action
          key={xcodeProject.filePath}
          title="Add Swift Package"
          icon={Icon.Plus}
          onAction={() => {
            navigation.pop();
            return addSwiftPackage(props.url, xcodeProject, navigation);
          }}
        />,
      ]}
    />
  );
}

/**
 * Add Swift Package
 * @param swiftPackageUrl The Swift Package Url
 * @param xcodeProject The XcodeProject where the Swift Package should be added
 * @param navigation The Navigation
 */
async function addSwiftPackage(swiftPackageUrl: string, xcodeProject: XcodeProject, navigation: Navigation) {
  try {
    // Launch Xcode if needed
    // To ensure that Xcode is already running
    // before closing the main Raycast window
    await launchXcodeIfNeeded();
    // Close main Raycast window to prevent
    // that the main focus is on the Raycast window
    await closeMainWindow();
    // Add Swift Package from Url to XcodeProject
    await XcodeSwiftPackageService.addSwiftPackage(swiftPackageUrl, xcodeProject.filePath);
    // Pop back
    navigation.pop();
  } catch (error) {
    // Log Error
    console.error(error);
    // Show a failure HUD as main Raycast window has already been closed
    await showHUD("⚠️ An error occurred while trying to add the Swift Package");
  }
}

/**
 * Launch Xcode if needed
 */
async function launchXcodeIfNeeded() {
  // Check if Xcode is running
  if (await XcodeService.isXcodeRunning()) {
    // Return out of function
    return;
  }
  // Show loading Toast
  const loadingToast = await showToast({
    style: Toast.Style.Animated,
    title: "Launching Xcode",
  });
  try {
    // Launch Xcode
    await XcodeService.launchXcode();
  } catch {
    // Ignore error
  } finally {
    // Hide loading Toast
    await loadingToast.hide();
  }
}
