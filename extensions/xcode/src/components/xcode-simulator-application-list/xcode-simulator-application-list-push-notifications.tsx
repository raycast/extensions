import { XcodeSimulatorApplication } from "../../models/xcode-simulator/xcode-simulator-application.model";
import { Action, ActionPanel, Form, Toast, getSelectedFinderItems, showToast } from "@raycast/api";
import { useState, useEffect } from "react";
import { operationWithUserFeedback } from "../../shared/operation-with-user-feedback";
import fs from "fs";
import { XcodeSimulatorService } from "../../services/xcode-simulator.service";

type Values = {
  files: string[];
};

export function XcodeSimulatorApplicationPushNotifications(props: {
  application: XcodeSimulatorApplication;
}): JSX.Element {
  const [currentFile, setCurrentFile] = useState<string[]>([]);

  function isFileValid(file: string) {
    if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
      return false;
    }
    return true;
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
      } catch (error: any) {
        //no op
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
      () => XcodeSimulatorService.pushNotifications(file, props.application)
    ).then();
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" onSubmit={(values: Values) => submit(values)} />
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
