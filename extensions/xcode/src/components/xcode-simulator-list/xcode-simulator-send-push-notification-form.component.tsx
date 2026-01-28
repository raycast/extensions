import { Action, ActionPanel, Form, Image } from "@raycast/api";
import { XcodeSimulator } from "../../models/xcode-simulator/xcode-simulator.model";
import { useState } from "react";
import { usePromise } from "@raycast/utils";
import { XcodeSimulatorApplicationService } from "../../services/xcode-simulator-application.service";
import { operationWithUserFeedback } from "../../shared/operation-with-user-feedback";
import { XcodeSimulatorService } from "../../services/xcode-simulator.service";

/**
 * Xcode Simulator Send Push Notification Form
 */
export function XcodeSimulatorSendPushNotificationForm(props: {
  simulator: XcodeSimulator;
  preferredBundleIdentifier?: string;
}) {
  const [payloadFilePath, setPayloadFilePath] = useState<string>("");
  const [bundleIdentifier, setBundleIdentifier] = useState<string>(props.preferredBundleIdentifier ?? "");
  const xcodeSimulatorApplications = usePromise(() =>
    XcodeSimulatorApplicationService.findXcodeSimulatorApplications(props.simulator)
  );
  return (
    <Form
      navigationTitle="Send Push Notification"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Send"
            onSubmit={() =>
              operationWithUserFeedback(
                "Sending Push Notification...",
                `Successfully send push notification to ${props.simulator.name}`,
                `An error occurred while trying to send a push notification to ${props.simulator.name}`,
                () => XcodeSimulatorService.sendPushNotification(props.simulator, bundleIdentifier, payloadFilePath)
              ).then()
            }
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Simulator" text={props.simulator.name} />
      <Form.Dropdown id="bundleIdentifier" title="App" value={bundleIdentifier} onChange={setBundleIdentifier}>
        {xcodeSimulatorApplications.data?.map((application) => (
          <Form.Dropdown.Item
            key={application.id}
            value={application.bundleIdentifier}
            title={application.name}
            icon={{
              source: application.appIconPath ?? "app-icon-placeholder.png",
              mask: Image.Mask.RoundedRectangle,
            }}
          />
        ))}
      </Form.Dropdown>
      <Form.FilePicker
        id="payloadFilePath"
        title="APNs Payload File"
        allowMultipleSelection={false}
        value={payloadFilePath ? [payloadFilePath] : []}
        onChange={(paths) => setPayloadFilePath(paths.at(0) ?? "")}
      ></Form.FilePicker>
    </Form>
  );
}
