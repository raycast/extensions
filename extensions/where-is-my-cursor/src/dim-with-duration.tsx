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
  duration: string;
}

export default function Command() {
  // Check if the process is already running
  if (fs.existsSync(lockFilePath)) {
    try {
      execSync(`"${helperPath}" "${supportPath}" off`);
      showHUD("Dimming turned off");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to turn off Dimming",
        message: errorMessage,
      });
    }
    // Return null to prevent the form from rendering, Raycast will close the window.
    return null;
  }

  function handleSubmit(values: FormValues) {
    const duration = parseInt(values.duration, 10);
    if (isNaN(duration) || duration <= 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Duration",
        message: "Please enter a positive number for the duration.",
      });
      return;
    }

    const command = `"${helperPath}" ${duration}`;

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
          title: "Failed to start dimming",
          message: error.message,
        });
      } else {
        showHUD(`Dimming started for ${duration} seconds`);
      }
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Dimming" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="duration"
        title="Duration"
        placeholder="Enter duration in seconds"
        defaultValue="10"
      />
    </Form>
  );
}
