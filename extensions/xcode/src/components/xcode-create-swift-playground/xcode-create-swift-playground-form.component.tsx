import { Action, ActionPanel, Form, Navigation, showHUD, Toast, useNavigation } from "@raycast/api";
import { XcodeSwiftPlaygroundPlatform } from "../../models/swift-playground/xcode-swift-playground-platform.model";
import { XcodeSwiftPlaygroundService } from "../../services/xcode-swift-playground.service";
import { XcodeSwiftPlaygroundTemplate } from "../../models/swift-playground/xcode-swift-playground-template.model";
import { operationWithUserFeedback } from "../../shared/operation-with-user-feedback";
import { XcodeSwiftPlaygroundCreationParameters } from "../../models/swift-playground/xcode-swift-playground-creation-parameters.model";
import tildify from "tildify";
import { useState } from "react";
import {
  xcodeSwiftPlaygroundLatestSwiftVersion,
  xcodeSwiftPlaygroundSwiftVersions,
} from "../../models/swift-playground/xcode-swift-playground-swift-version.model";

/**
 * Xcode create Swift Playground Form
 */
export function XcodeCreateSwiftPlaygroundForm() {
  const navigation = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();
  const [locationError, setLocationError] = useState<string | undefined>();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={"Open or create Swift Playground"}
            onSubmit={(formValues) => submit(formValues, navigation, false)}
          />
          <Action.SubmitForm
            title={"Create Swift Playground"}
            onSubmit={(formValues) => submit(formValues, navigation, true)}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue="MyPlayground"
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
        defaultValue={XcodeSwiftPlaygroundService.defaultSwiftPlaygroundLocation}
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
      <Form.Dropdown id="platform" title="Platform" defaultValue={XcodeSwiftPlaygroundPlatform.iOS}>
        {Object.keys(XcodeSwiftPlaygroundPlatform)
          .map((platform) => platform.toLocaleLowerCase())
          .map((platform) => (
            <Form.Dropdown.Item key={platform} value={platform} title={platform.replace("os", "OS")} />
          ))}
      </Form.Dropdown>
      <Form.Dropdown id="swiftVersion" title="Swift Version" defaultValue={xcodeSwiftPlaygroundLatestSwiftVersion}>
        {xcodeSwiftPlaygroundSwiftVersions.map((swiftVersion) => (
          <Form.Dropdown.Item key={swiftVersion} value={swiftVersion} title={swiftVersion} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="template" title="Template" defaultValue={XcodeSwiftPlaygroundTemplate.Empty}>
        {Object.keys(XcodeSwiftPlaygroundTemplate).map((template) => (
          <Form.Dropdown.Item key={template} value={template} title={template} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox id="open" label="Open in Xcode after creation" defaultValue={true} />
    </Form>
  );
}

/**
 * Submit Form Values
 * @param formValues The Form values
 * @param navigation The Navigation
 * @param forceCreate Bool value if creation of a Swift Playground should be enforced
 */
async function submit(formValues: Form.Values, navigation: Navigation, forceCreate: boolean) {
  if (!formValues.name || !formValues.location) {
    return;
  }
  const operationResult = await operationWithUserFeedback(
    "Creating Swift Playground",
    "Swift Playground successfully created",
    "An error occurred while trying to create the Swift Playground",
    async () => {
      return await XcodeSwiftPlaygroundService.createSwiftPlayground(
        formValues as XcodeSwiftPlaygroundCreationParameters,
        forceCreate
      );
    }
  );
  // Check if operation failed
  if (!operationResult.result) {
    // Return out of function
    return;
  }
  // Check if Swift Playground already exists and should not be opened
  if (operationResult.result.alreadyExists && !formValues.open) {
    // Inform user that the Playground already exists
    operationResult.toast.style = Toast.Style.Failure;
    operationResult.toast.title = "Swift Playground already exists";
    // Return out of function
    return;
  }
  // Initialize success message title
  const successMessageTitle = [
    "Swift Playground",
    operationResult.result.alreadyExists ? "opened" : "created",
    "at",
    tildify(operationResult.result.path),
  ].join(" ");
  // Check if Swift Playground should be opened after creation
  if (formValues.open) {
    try {
      // Open Swift Playground
      await operationResult.result.open();
      // Show success HUD
      await showHUD(successMessageTitle);
    } catch {
      // Show failure Toast
      operationResult.toast.style = Toast.Style.Failure;
      operationResult.toast.title = "Swift Playground could not be opened";
    }
  } else {
    // Show success message
    operationResult.toast.title = successMessageTitle;
  }
  // Pop to root
  navigation.pop();
}
