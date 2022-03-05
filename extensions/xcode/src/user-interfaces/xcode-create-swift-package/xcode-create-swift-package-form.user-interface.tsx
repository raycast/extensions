import { Action, ActionPanel, Form, Navigation, showHUD, showToast, Toast } from "@raycast/api";
import { XcodeSwiftPackageType } from "../../models/swift-package/xcode-swift-package-type.model";
import { XcodeSwiftPackageService } from "../../services/xcode-swift-package.service";
import { XcodeSwiftPackageCreationParameters } from "../../models/swift-package/xcode-swift-package-creation-parameters.model";
import { XcodeSwiftPackage } from "../../models/swift-package/xcode-swift-package.model";

/**
 * Xcode create Swift Package Form
 * @param xcodeSwiftPackageService The XcodeSwiftPackageService
 * @param navigation The Navigation
 */
export function xcodeCreateSwiftPackageForm(
  xcodeSwiftPackageService: XcodeSwiftPackageService,
  navigation: Navigation
): JSX.Element {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={"Create Swift Package"}
            onSubmit={async (formValues) => {
              await onFormSubmit(formValues, xcodeSwiftPackageService, navigation);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={"Name"} defaultValue="MyLibrary" />
      <Form.TextField id="location" title="Location" defaultValue="~/Desktop" />
      <Form.Dropdown id="type" title="Type" defaultValue={XcodeSwiftPackageType.library}>
        {Object.keys(XcodeSwiftPackageType).map((packageType) => {
          return (
            <Form.Dropdown.Item
              key={packageType}
              value={packageType}
              title={packageType.charAt(0).toUpperCase() + packageType.slice(1)}
            />
          );
        })}
      </Form.Dropdown>
      <Form.Checkbox id="open" label="Open in Xcode after creation" defaultValue={true} />
    </Form>
  );
}

/**
 * On Form Submit
 * @param formValues The Form values
 * @param xcodeSwiftPackageService XcodeSwiftPackageService
 * @param navigation The Navigation
 */
async function onFormSubmit(
  formValues: any,
  xcodeSwiftPackageService: XcodeSwiftPackageService,
  navigation: Navigation
) {
  // Declare Swift Package
  let swiftPackage: XcodeSwiftPackage;
  try {
    // Create Swift Package with parameters
    swiftPackage = await xcodeSwiftPackageService.createSwiftPackage(formValues as XcodeSwiftPackageCreationParameters);
  } catch {
    // Show failure Toast
    await showToast({
      style: Toast.Style.Failure,
      title: "An error occurred while creating the Swift Package",
    });
    // Return out of function
    return;
  }
  // Initialize success message title
  const successMessageTitle = `Swift Package created at ${swiftPackage.path}`;
  // Check if Swift Package should be opened after creation
  if (formValues.open) {
    try {
      // Open Swift Package
      await swiftPackage.open();
      // Show success HUD
      await showHUD(successMessageTitle);
    } catch {
      // Show failure Toast
      await showToast({
        style: Toast.Style.Failure,
        title: "Swift Package could not be opened",
      });
    }
  } else {
    // Show success Toast
    await showToast({
      style: Toast.Style.Success,
      title: successMessageTitle,
    });
  }
  // Pop to root
  navigation.pop();
}
