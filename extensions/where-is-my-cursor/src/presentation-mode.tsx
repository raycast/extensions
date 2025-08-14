import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  environment,
  closeMainWindow,
  PopToRootType,
  showHUD,
} from "@raycast/api";
import { exec, execSync } from "child_process";
import { join } from "path";
import * as fs from "fs";

const helperPath = join(environment.assetsPath, "LocateCursor");
const supportPath = environment.supportPath;
const lockFilePath = join(supportPath, "LocateCursor.lock");

interface FormValues {
  screenOpacity: string;
  circleOpacity: string;
  hasBorder: boolean;
}

export default function Command() {
  // Check if the process is already running
  if (fs.existsSync(lockFilePath)) {
    try {
      execSync(`"${helperPath}" "${supportPath}" off`);
      showHUD("Presentation Mode turned off");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to turn off Presentation Mode",
        message: errorMessage,
      });
    }
    // Return null to prevent the form from rendering, Raycast will close the window.
    return null;
  }

  function handleSubmit(values: FormValues) {
    const screenOpacity = parseInt(values.screenOpacity, 10) ?? 30;
    const circleOpacity = parseInt(values.circleOpacity, 10) ?? 30;
    const hasBorder = values.hasBorder ? 1 : 0;

    if (isNaN(screenOpacity) || screenOpacity < 0 || screenOpacity > 80) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Screen Opacity",
        message: "Please enter a number between 0 and 80.",
      });
      // screenOpacity = 30;
      // return;
    }

    if (isNaN(circleOpacity) || circleOpacity < 0 || circleOpacity > 80) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Circle Opacity",
        message: "Please enter a number between 0 and 80.",
      });
      // circleOpacity = 30;
      // return;
    }

    const command = `"${helperPath}" pon ${screenOpacity} ${circleOpacity} ${hasBorder}`;

    // Close the form immediately for a better user experience
    // popToRoot({ clearSearchBar: true });
    closeMainWindow({
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });

    exec(command, (error) => {
      if (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to start Presentation Mode",
          message: error.message,
        });
      } else {
        showHUD("Presentation Mode turned off");
      }
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Presentation Mode"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="screenOpacity"
        title="Screen Dimming Opacity"
        placeholder="Enter opacity (0-80), default 30"
        defaultValue="30"
      />
      <Form.TextField
        id="circleOpacity"
        title="Yellow Circle Opacity"
        placeholder="Enter opacity (0-80), default 30"
        defaultValue="30"
      />
      <Form.Checkbox
        id="hasBorder"
        label="Show White Border?"
        defaultValue={false}
      />
    </Form>
  );
}
