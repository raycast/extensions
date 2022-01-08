import { ActionPanel, closeMainWindow, Icon, List, Navigation, showHUD, showToast, ToastStyle } from "@raycast/api";
import { XcodeSwiftPackageService } from "../../services/xcode-swift-package.service";
import { XcodeSwiftPackageMetadata } from "../../models/swift-package/xcode-swift-package-metadata.model";
import { swiftPackageMetadataSection } from "./xcode-add-swift-package-metadata-section.user-interface";
import { AddSwiftPackageAction } from "./xcode-add-swift-package-action.user-interface";
import { XcodeProject } from "../../models/project/xcode-project.model";
import { XcodeService } from "../../services/xcode.service";

/**
 * Xcode add Swift Package Form
 * @param swiftPackageUrl The Swift Package Url
 * @param setSwiftPackageUrl The set Swift Package Url function
 * @param swiftPackageMetadata The optional Swift Package Metadata
 * @param xcodeSwiftPackageService The XcodeSwiftPackageService
 * @param xcodeService The XcodeService
 * @param navigation The Navigation
 */
export function xcodeAddSwiftPackageForm(
  swiftPackageUrl: string,
  setSwiftPackageUrl: (url: string) => void,
  swiftPackageMetadata: XcodeSwiftPackageMetadata | undefined,
  xcodeSwiftPackageService: XcodeSwiftPackageService,
  xcodeService: XcodeService,
  navigation: Navigation
): JSX.Element {
  return (
    <List searchBarPlaceholder="Enter Swift Package URL" onSearchTextChange={setSwiftPackageUrl}>
      <List.Section key="swift-package" title="Swift Package">
        <List.Item
          id="add-swift-package"
          icon={Icon.Plus}
          title="Add Swift Package"
          subtitle={xcodeSwiftPackageService.isSwiftPackageUrlValid(swiftPackageUrl) ? swiftPackageUrl : undefined}
          actions={
            <ActionPanel>
              <AddSwiftPackageAction
                swiftPackageUrl={swiftPackageUrl}
                xcodeSwiftPackageService={xcodeSwiftPackageService}
                navigation={navigation}
                onSelect={(xcodeProject) => {
                  addSwiftPackage(swiftPackageUrl, xcodeProject, xcodeSwiftPackageService, xcodeService, navigation);
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      {swiftPackageMetadata ? swiftPackageMetadataSection(swiftPackageMetadata) : undefined}
    </List>
  );
}

/**
 * Add Swift Package
 * @param swiftPackageUrl The Swift Package Url
 * @param xcodeProject The XcodeProject where the Swift Package should be added
 * @param xcodeSwiftPackageService The XcodeSwiftPackageService
 * @param xcodeService The XcodeService
 * @param navigation The Navigation
 */
async function addSwiftPackage(
  swiftPackageUrl: string,
  xcodeProject: XcodeProject,
  xcodeSwiftPackageService: XcodeSwiftPackageService,
  xcodeService: XcodeService,
  navigation: Navigation
) {
  try {
    // Launch Xcode if needed
    // To ensure that Xcode is already running
    // before closing the main Raycast window
    await launchXcodeIfNeeded(xcodeService);
    // Close main Raycast window to prevent
    // that the main focus is on the Raycast window
    await closeMainWindow();
    // Add Swift Package from Url to XcodeProject
    await xcodeSwiftPackageService.addSwiftPackage(swiftPackageUrl, xcodeProject);
    // Pop back
    navigation.pop();
  } catch (error) {
    // Log Error
    console.error(error);
    // Show a failure HUD as main Raycast window
    // has already been closed
    showHUD("⚠️ An error occurred while trying to add the Swift Package");
  }
}

/**
 * Launch Xcode if needed
 * @param xcodeService The XcodeService
 */
async function launchXcodeIfNeeded(xcodeService: XcodeService) {
  // Check if Xcode is running
  if (await xcodeService.isXcodeRunning()) {
    // Return out of function
    return;
  }
  // Show loading Toast
  const loadingToast = await showToast(ToastStyle.Animated, "Launching Xcode");
  try {
    // Launch Xcode
    await xcodeService.launchXcode();
  } catch {
    // Ignore error
  } finally {
    // Hide loading Toast
    loadingToast.hide();
  }
}
