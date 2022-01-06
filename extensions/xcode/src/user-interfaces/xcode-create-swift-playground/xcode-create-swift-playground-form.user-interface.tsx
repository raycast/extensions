import { ActionPanel, Form, Navigation, showHUD, showToast, SubmitFormAction, ToastStyle } from "@raycast/api";
import { XcodeSwiftPlaygroundService } from "../../services/xcode-swift-playground.service";
import { XcodeSwiftPlaygroundPlatform } from "../../models/swift-playground/xcode-swift-playground-platform.model";
import { XcodeSwiftPlayground } from "../../models/swift-playground/xcode-swift-playground.model";
import { XcodeSwiftPlaygroundCreationParameters } from "../../models/swift-playground/xcode-swift-playground-creation-parameters.model";
import { XcodeSwiftPlaygroundTemplate } from "../../models/swift-playground/xcode-swift-playground-template.model";
import tildify from "tildify";

/**
 * Xcode create Swift Playground Form
 * @param xcodeSwiftPlaygroundService The XcodeSwiftPlaygroundService
 * @param navigation The Navigation
 */
export function xcodeCreateSwiftPlaygroundForm(
  xcodeSwiftPlaygroundService: XcodeSwiftPlaygroundService,
  navigation: Navigation
): JSX.Element {
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction
            title={"Create Swift Playground"}
            onSubmit={(formValues) => {
              onFormSubmit(formValues, xcodeSwiftPlaygroundService, navigation);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={"Name"} defaultValue="MyPlayground" />
      <Form.TextField id="location" title="Location" defaultValue="~/Desktop" />
      <Form.Dropdown id="platform" title="Platform" defaultValue={XcodeSwiftPlaygroundPlatform.iOS}>
        {Object.keys(XcodeSwiftPlaygroundPlatform)
          .map((platform) => platform.toLocaleLowerCase())
          .map((platform) => {
            return <Form.Dropdown.Item key={platform} value={platform} title={platform.replace("os", "OS")} />;
          })}
      </Form.Dropdown>
      <Form.Dropdown id="template" title="Template" defaultValue={XcodeSwiftPlaygroundTemplate.empty}>
        {Object.keys(XcodeSwiftPlaygroundTemplate).map((platform) => {
          return (
            <Form.Dropdown.Item
              key={platform}
              value={platform}
              title={platform.charAt(0).toUpperCase() + platform.slice(1)}
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
 * @param xcodeSwiftPlaygroundService XcodeSwiftPlaygroundService
 * @param navigation The Navigation
 */
async function onFormSubmit(
  formValues: any,
  xcodeSwiftPlaygroundService: XcodeSwiftPlaygroundService,
  navigation: Navigation
) {
  // Declare Swift Playground
  let swiftPlayground: XcodeSwiftPlayground;
  try {
    // Create Swift Playground with parameters
    swiftPlayground = await xcodeSwiftPlaygroundService.createSwiftPlayground(
      formValues as XcodeSwiftPlaygroundCreationParameters
    );
  } catch (error) {
    // Log error
    console.log(error);
    // Show failure Toast
    await showToast(ToastStyle.Failure, "An error occurred while creating the Swift Playground");
    // Return out of function
    return;
  }
  // Check if Swift Playground already exists and should not be opened
  if (swiftPlayground.alreadyExists && !formValues.open) {
    // Inform user that the Playground already exists
    return showToast(ToastStyle.Failure, "Swift Playground already exists");
  }
  // Initialize success message title
  const successMessageTitle = [
    "Swift Playground",
    swiftPlayground.alreadyExists ? "opened" : "created",
    "at",
    tildify(swiftPlayground.path),
  ].join(" ");
  // Check if should open Swift Playground after creation
  if (formValues.open) {
    try {
      // Open Swift Playground
      await swiftPlayground.open();
      // Show success HUD
      await showHUD(successMessageTitle);
    } catch {
      // Show failure Toast
      await showToast(ToastStyle.Failure, "Swift Playground could not be opened");
    }
  } else {
    // Show success Toast
    await showToast(ToastStyle.Success, successMessageTitle);
  }
  // Pop to root
  navigation.pop();
}
