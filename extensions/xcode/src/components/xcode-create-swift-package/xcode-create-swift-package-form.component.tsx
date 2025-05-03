import { Action, ActionPanel, Form, Navigation, showHUD, Toast, useNavigation } from "@raycast/api";
import { XcodeSwiftPackageType } from "../../models/swift-package/xcode-swift-package-type.model";
import { operationWithUserFeedback } from "../../shared/operation-with-user-feedback";
import { XcodeSwiftPackageService } from "../../services/xcode-swift-package.service";
import { XcodeSwiftPackageCreationParameters } from "../../models/swift-package/xcode-swift-package-creation-parameters.model";
import { useState } from "react";

/**
 * Xcode create Swift Package Form
 */
export function XcodeCreateSwiftPackageForm() {
  const navigation = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [locationError, setLocationError] = useState<string | undefined>();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Swift Package" onSubmit={(formValues) => submit(formValues, navigation)} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue="MyLibrary"
        error={nameError}
        onChange={() => {
          if (nameError && nameError.length > 0) {
            setNameError(undefined);
          }
        }}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("Please enter a name.");
          } else if (nameError && nameError.length > 0) {
            setNameError(undefined);
          }
        }}
      />
      <Form.TextField
        id="location"
        title="Location"
        defaultValue="~/Desktop"
        error={locationError}
        onChange={() => {
          if (locationError && locationError.length > 0) {
            setLocationError(undefined);
          }
        }}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setLocationError("Please enter a location.");
          } else if (locationError && locationError.length > 0) {
            setLocationError(undefined);
          }
        }}
      />
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
 * Submit FormValues
 * @param formValues The FormValues
 * @param navigation The Navigation
 */
async function submit(formValues: Form.Values, navigation: Navigation) {
  if (!formValues.name || !formValues.location) {
    return;
  }
  const operationResult = await operationWithUserFeedback(
    "Creating Swift Package",
    "Swift Package successfully created",
    "An error occurred while trying to create the Swift Package",
    async () => {
      return await XcodeSwiftPackageService.createSwiftPackage(formValues as XcodeSwiftPackageCreationParameters);
    }
  );
  // Check if Swift Package should be opened after creation
  if (operationResult.result && formValues.open) {
    try {
      // Open Swift Package
      await operationResult.result.open();
      // Show success HUD
      await showHUD(`Swift Package created at ${operationResult.result.path}`);
    } catch {
      // Show failure Toast
      operationResult.toast.style = Toast.Style.Failure;
      operationResult.toast.title = "Swift Package couldn't be opened";
    }
  }
  // Pop to root
  navigation.pop();
}
