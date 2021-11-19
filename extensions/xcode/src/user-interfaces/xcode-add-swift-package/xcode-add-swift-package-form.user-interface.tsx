import {
  ActionPanel,
  closeMainWindow,
  Form,
  Navigation,
  showToast,
  SubmitFormAction,
  Toast,
  ToastStyle
} from "@raycast/api";
import {XcodeSwiftPackageService} from "../../services/xcode-swift-package.service";
import {xcodeProjectList} from "../xcode-projects/xcode-project-list.user-interface";
import {XcodeProject} from "../../models/project/xcode-project.model";
import {XcodeAddSwiftPackageXcodeNotRunningError} from "../../models/swift-package/xcode-add-swift-package-xcode-not-running-error.model";

/**
 * Xcode add Swift Package Form
 * @param xcodeSwiftPackageService The XcodeSwiftPackageService
 * @param navigation The Navigation
 * @param availableXcodeProjects The optional available XcodeProjects
 * @param swiftPackageUrl The Swift Package Url
 * @param setSwiftPackageUrl An arrow function to set the Swift Package Url
 */
export function xcodeAddSwiftPackageForm(
  xcodeSwiftPackageService: XcodeSwiftPackageService,
  navigation: Navigation,
  availableXcodeProjects: XcodeProject[] | undefined,
  swiftPackageUrl: string,
  setSwiftPackageUrl: (url: string) => void
): JSX.Element {
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction
            title={"Add Swift Package"}
            onSubmit={
              formValues => {
                addSwiftPackage(
                  formValues.swiftPackageUrl,
                  xcodeSwiftPackageService,
                  navigation,
                  availableXcodeProjects
                )
              }
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="swiftPackageUrl"
        title={"Swift Package URL"}
        placeholder={"https://github.com/User/Repo"}
        value={swiftPackageUrl}
        onChange={setSwiftPackageUrl}
      />
    </Form>
  );
}

/**
 * Add Swift Package
 * @param swiftPackageUrl The Swift Package Url
 * @param xcodeSwiftPackageService The XcodeSwiftPackageService
 * @param navigation The Navigation
 * @param availableXcodeProjects The optional available XcodeProjects
 * @param selectedXcodeProject The optional selected XcodeProject. Default value `undefined`
 * @param loadingToast The optional loading Toast. Default value `undefined`
 */
async function addSwiftPackage(
  swiftPackageUrl: string,
  xcodeSwiftPackageService: XcodeSwiftPackageService,
  navigation: Navigation,
  availableXcodeProjects: XcodeProject[] | undefined,
  selectedXcodeProject: XcodeProject | undefined = undefined,
  loadingToast: Toast | undefined = undefined
) {
  // Check if Swift Package Url is unavailable
  if (!swiftPackageUrl) {
    // Return out of function and show failure Toast
    return showToast(
      ToastStyle.Failure, 'Please enter a url to a Swift Package'
    );
  }
  // Declare AddSwiftPackageResult which is either:
  // An Array of XcodeProjects to choose from
  // or an void type representing the state where the Swift Package was successfully added
  let addSwiftPackageResult: XcodeProject[] | void;
  try {
    // Add Swift Package with URL and optional selected XcodeProject
    addSwiftPackageResult = await xcodeSwiftPackageService.addSwiftPackage(
      swiftPackageUrl,
      selectedXcodeProject
    );
  } catch (error) {
    // Check if Xcode is not running
    if (error instanceof XcodeAddSwiftPackageXcodeNotRunningError) {
      // Push XcodeProject Selection List if needed
      return pushXcodeProjectSelectionListIfNeeded(
        navigation,
        [],
        availableXcodeProjects ?? [],
        async (selectedXcodeProject) => {
          // Show loading Toast
          const loadingToast = await showToast(
            ToastStyle.Animated,
            'Launching Xcode. Please wait...'
          );
          // Re-Invoke addSwiftPackage with selected XcodeProject
          addSwiftPackage(
            swiftPackageUrl,
            xcodeSwiftPackageService,
            navigation,
            availableXcodeProjects,
            selectedXcodeProject,
            loadingToast
          );
        }
      )
    } else {
      // Log Error
      console.error(error);
      // Check if a loading Toast is available
      if (loadingToast) {
        // Hide loading Toast
        loadingToast.hide();
      }
      // Show failure Toast
      return showToast(
        ToastStyle.Failure,
        'An error occurred while trying to add Swift Package'
      )
    }
  }
  // Check if AddSwiftPackageResult is an Array
  if (Array.isArray(addSwiftPackageResult)) {
    // Push XcodeProject Selection List if needed
    return pushXcodeProjectSelectionListIfNeeded(
      navigation,
      addSwiftPackageResult as XcodeProject[],
      availableXcodeProjects ?? [],
      (selectedXcodeProject) => {
        // Re-Invoke addSwiftPackage with selected XcodeProject
        addSwiftPackage(
          swiftPackageUrl,
          xcodeSwiftPackageService,
          navigation,
          availableXcodeProjects,
          selectedXcodeProject
        );
      }
    );
  }
  // Check if a loading Toast is available
  if (loadingToast) {
    // Hide loading Toast
    loadingToast.hide();
  }
  // Pop back
  navigation.pop();
  // Close Main Window
  closeMainWindow();
}

/**
 * Push XcodeProjects Selection List if needed
 * @param navigation The Navigation
 * @param openedXcodeProjects The opened XcodeProjects
 * @param availableXcodeProjects The available XcodeProjects
 * @param onSelect The arrow function which will be invoked when a XcodeProject has been selected by the user
 */
function pushXcodeProjectSelectionListIfNeeded(
  navigation: Navigation,
  openedXcodeProjects: XcodeProject[],
  availableXcodeProjects: XcodeProject[],
  onSelect: (xcodeProject: XcodeProject) => void
) {
  // Check if no XcodeProjects are available
  if (openedXcodeProjects.concat(availableXcodeProjects).length === 0) {
    // Return out of function and show failure Toast
    return showToast(
      ToastStyle.Failure,
      'No Xcode Projects were found'
    );
  }
  // Initialize XcodeProjects by concatenating opened and available XcodeProjects
  const xcodeProjects = openedXcodeProjects
    .concat(
      availableXcodeProjects
        // Filter out opened XcodeProjects from available XcodeProjects to avoid duplicates
        .filter(xcodeProject => {
          return !openedXcodeProjects
            .map(openedXcodeProject => openedXcodeProject.filePath)
            .includes(xcodeProject.filePath);
        })
    );
  // Push XcodeProject List
  navigation.push(
    xcodeProjectList(
      xcodeProjects,
      "Select the Xcode Project where the Swift Package should be added",
      (xcodeProject) => {
        return <ActionPanel.Item
          title={"Add Swift Package"}
          onAction={
            () => {
              // Pop back
              navigation.pop()
              // Invoke onSelect with XcodeProject
              onSelect(xcodeProject);
            }
          }
        />
      }
    )
  );
}
