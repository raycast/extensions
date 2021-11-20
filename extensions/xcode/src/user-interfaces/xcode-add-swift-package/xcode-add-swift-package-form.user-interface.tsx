import {ActionPanel, closeMainWindow, Icon, List, Navigation, showHUD, showToast, ToastStyle} from "@raycast/api";
import {XcodeSwiftPackageService} from "../../services/xcode-swift-package.service";
import {XcodeProject} from "../../models/project/xcode-project.model";
import {XcodeAddSwiftPackageSelectXcodeProject} from "./xcode-add-swift-package-select-xcode-project.user-interface";

/**
 * Xcode add Swift Package Form
 * @param swiftPackageUrl The Swift Package Url
 * @param setSwiftPackageUrl The set Swift Package Url function
 * @param xcodeSwiftPackageService The XcodeSwiftPackageService
 * @param navigation The Navigation
 */
export function xcodeAddSwiftPackageForm(
  swiftPackageUrl: string,
  setSwiftPackageUrl: (url: string) => void,
  xcodeSwiftPackageService: XcodeSwiftPackageService,
  navigation: Navigation
): JSX.Element {
  return (
    <List
      searchBarPlaceholder={"Enter Swift Package URL"}
      onSearchTextChange={setSwiftPackageUrl}>
      <List.Section
        title={"Swift Package"}>
        <List.Item
          id={"add-swift-package"}
          icon={Icon.Plus}
          title={"Add Swift Package"}
          subtitle={swiftPackageUrl}
          actions={
            <ActionPanel>
              <AddSwiftPackageAction
                swiftPackageUrl={swiftPackageUrl}
                xcodeSwiftPackageService={xcodeSwiftPackageService}
                navigation={navigation}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

/**
 * Add Swift Package Action
 * @param props The properties
 */
function AddSwiftPackageAction(
  props: {
    swiftPackageUrl: string,
    xcodeSwiftPackageService: XcodeSwiftPackageService,
    navigation: Navigation
  }
): JSX.Element {
  return <ActionPanel.Item
    title={"Add Swift Package"}
    onAction={
      () => {
        // Check if Swift Package Url is valid
        if (props.xcodeSwiftPackageService.isSwiftPackageUrlValid(props.swiftPackageUrl)) {
          // Initialize select XcodeProject component
          const selectXcodeProjectComponent = <XcodeAddSwiftPackageSelectXcodeProject
            onSelect={
              (xcodeProject) => {
                // Pop back
                props.navigation.pop()
                // Add Swift Package to selected XcodeProject
                addSwiftPackage(
                  props.swiftPackageUrl,
                  xcodeProject,
                  props.xcodeSwiftPackageService,
                  props.navigation
                )
              }
            }
          />;
          // Push select XcodeProject component
          props.navigation.push(selectXcodeProjectComponent);
        } else {
          // Otherwise show failure Toast
          showToast(
            ToastStyle.Failure, 'Please enter a valid url to a Swift Package'
          );
        }
      }
    }
  />;
}

/**
 * Add Swift Package
 * @param swiftPackageUrl The Swift Package Url
 * @param xcodeProject The XcodeProject where the Swift Package should be added
 * @param xcodeSwiftPackageService The XcodeSwiftPackageService
 * @param navigation The Navigation
 */
async function addSwiftPackage(
  swiftPackageUrl: string,
  xcodeProject: XcodeProject,
  xcodeSwiftPackageService: XcodeSwiftPackageService,
  navigation: Navigation
) {
  // Show loading Toast
  const loadingToast = await showToast(
    ToastStyle.Animated,
    "Adding Swift Package please wait"
  )
  try {
    // Close main Raycast window to prevent
    // that the main focus is on the Raycast window
    await closeMainWindow();
    // Add Swift Package from Url to XcodeProject
    await xcodeSwiftPackageService
      .addSwiftPackage(
        swiftPackageUrl,
        xcodeProject
      );
    // Pop back
    navigation.pop();
  } catch (error) {
    // Log Error
    console.error(error);
    // Show a failure HUD as main Raycast window
    // has already been closed
    showHUD(
      "⚠️ An error occurred while trying to add the Swift Package"
    );
  } finally {
    // Hide loading Toast
    await loadingToast.hide();
  }
}
