import { useEffect, useState, EffectCallback, DependencyList } from "react";
import { XcodeSwiftPackageMetadata } from "../../models/swift-package/xcode-swift-package-metadata.model";
import { XcodeSwiftPackageService } from "../../services/xcode-swift-package.service";
import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Form,
  Icon,
  Navigation,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { XcodeProject } from "../../models/xcode-project/xcode-project.model";
import { XcodeService } from "../../services/xcode.service";
import { XcodeProjectList } from "../xcode-project-list/xcode-project-list.component";
import { XcodeProjectType } from "../../models/xcode-project/xcode-project-type.model";

/**
 * Xcode add Swift Package Form
 */
export function XcodeAddSwiftPackageForm(): JSX.Element {
  // Use navigation
  const navigation = useNavigation();
  // Use Swift Package Url State
  const [swiftPackageUrl, setSwiftPackageUrl] = useState<string>("");
  // Use Swift Package Url State
  const [swiftPackageMetadata, setSwiftPackageMetadata] = useState<XcodeSwiftPackageMetadata | undefined>(undefined);
  // Use Effect to read current Clipboard contents once
  useEffect(() => {
    // Retrieve Swift Package Url from Clipboard
    Clipboard.readText()
      .then((contents) => {
        // Check if clipboard contents is a valid Swift Package Url
        if (contents && XcodeSwiftPackageService.isSwiftPackageUrlValid(contents)) {
          // Return contents
          return contents;
        } else {
          // Otherwise, return null
          return null;
        }
      })
      // Replace error with null
      .catch(() => null)
      .then((url) => {
        // Check if an url is available
        if (url) {
          // Set Swift Package url
          setSwiftPackageUrl(url);
        }
      });
  }, []);
  // Use effect to load Swift Package Metadata
  useDebouncedEffect(
    () => {
      // Clear current Swift Package Metadata
      setSwiftPackageMetadata(undefined);
      // Retrieve Swift Package Metadata from Swift Package Url
      XcodeSwiftPackageService.getSwiftPackageMetadata(swiftPackageUrl)
        .catch(() => null)
        .then((metadata) => setSwiftPackageMetadata(metadata ?? undefined));
    },
    [swiftPackageUrl],
    500
  );
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Swift Package"
            onSubmit={async () => {
              await submitForm(swiftPackageUrl, navigation);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="url" title="Swift Package URL" value={swiftPackageUrl} onChange={setSwiftPackageUrl} />
      {swiftPackageMetadata?.name ? <Form.Description title="Name" text={swiftPackageMetadata.name} /> : null}
      {swiftPackageMetadata?.description ? (
        <Form.Description title="Description" text={swiftPackageMetadata.description} />
      ) : null}
      {swiftPackageMetadata?.starsCount ? (
        <Form.Description title="Stars" text={swiftPackageMetadata.starsCount.toString()} />
      ) : null}
      {swiftPackageMetadata?.license ? <Form.Description title="Name" text={swiftPackageMetadata.license} /> : null}
    </Form>
  );
}

/**
 * Submit Form
 * @param swiftPackageUrl The Swift Package URL
 * @param navigation The Navigation
 */
function submitForm(swiftPackageUrl: string, navigation: Navigation) {
  if (!XcodeSwiftPackageService.isSwiftPackageUrlValid(swiftPackageUrl)) {
    return showToast({
      style: Toast.Style.Failure,
      title: "Please enter a valid url to a Swift Package",
    });
  }
  navigation.push(
    <XcodeProjectList
      key="select-xcode-project"
      navigationTitle="Select Xcode Project"
      searchBarPlaceholder="Select Xcode Project"
      projectTypeFilter={(projectType) =>
        projectType === XcodeProjectType.project || projectType === XcodeProjectType.workspace
      }
      actions={(xcodeProject) => [
        <Action
          key="add-swift-package"
          title="Add Swift Package"
          icon={Icon.Plus}
          onAction={() => {
            navigation.pop();
            return addSwiftPackage(swiftPackageUrl, xcodeProject, navigation);
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
    await XcodeSwiftPackageService.addSwiftPackage(swiftPackageUrl, xcodeProject);
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

/**
 * Use debounced effect
 * @param effect The EffectCallback
 * @param deps The DependencyList
 * @param delay The delay
 */
const useDebouncedEffect = (effect: EffectCallback, deps: DependencyList | undefined, delay: number) => {
  useEffect(() => {
    const handler = setTimeout(() => effect(), delay);
    return () => clearTimeout(handler);
  }, [...(deps || []), delay]);
};
