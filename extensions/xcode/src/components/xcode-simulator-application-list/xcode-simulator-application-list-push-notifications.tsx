import { XcodeSimulatorApplication } from "../../models/xcode-simulator/xcode-simulator-application.model";
import { Action, ActionPanel, Form, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { operationWithUserFeedback } from "../../shared/operation-with-user-feedback";
import fs from "fs";
import { XcodeSimulatorService } from "../../services/xcode-simulator.service";

/**
 * The Values
 */
type Values = {
  files: string[];
};

/**
 * Xcode Simulator Application Push Notifications
 */
export function XcodeSimulatorApplicationPushNotifications(props: { application: XcodeSimulatorApplication }) {
  const [currentFile, setCurrentFile] = useState<string[]>([]);

  function isFileValid(file: string) {
    return !(!fs.existsSync(file) || !fs.lstatSync(file).isFile());
  }

  //attempt to get the current selected file in Finder if any.
  useEffect(() => {
    (async () => {
      try {
        const selectedFinderItems = await getSelectedFinderItems();
        if (
          selectedFinderItems &&
          selectedFinderItems.length > 0 &&
          isFileValid(selectedFinderItems[0].path) &&
          selectedFinderItems[0].path.endsWith(".json")
        ) {
          setCurrentFile([selectedFinderItems[0].path]);
        }
      } catch {
        // Simply ignore any error
      }
    })();
  }, []);

  async function submit(values: Values) {
    const file = values.files[0];
    if (!isFileValid(file)) {
      await showToast({ title: "Invalid File", style: Toast.Style.Failure });
      return;
    }
    await operationWithUserFeedback(
      "Pushing Notification..",
      `Successfully Pushed Notification to ${props.application.simulator.name}`,
      `An error occurred while trying to push notifications to ${props.application.simulator.name}`,
      () =>
        XcodeSimulatorService.sendPushNotification(
          props.application.simulator,
          props.application.bundleIdentifier,
          file
        )
    ).then();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        title="Payload File"
        id="files"
        allowMultipleSelection={false}
        value={currentFile}
        onChange={setCurrentFile}
      />
    </Form>
  );
}
