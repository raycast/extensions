import { Form, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { Devices } from "./bootedDevices";
import { useState } from "react";
import { Device } from "./types";
import { privacy } from "./util";
import { showBundleIdEmptyToast, showCouldntLoadDeviceToast, showExecutedToast } from "./toasts";

type Values = {
  bundleId: string;
  service: string;
  action: string;
};

export default function Command() {
  const [chosenDevice, setChosenDevice] = useState<Device | undefined>();

  async function handleSubmit(values: Values) {
    try {
      if (!chosenDevice) {
        await showCouldntLoadDeviceToast();
        return;
      }
      if (values.bundleId.trim().length === 0) {
        await showBundleIdEmptyToast();
        return;
      }

      await privacy(chosenDevice.udid, values.bundleId, values.action, values.service);
      await showExecutedToast();
    } catch (error: any) {
      await showToast({ title: `Error: ${error}`, style: Toast.Style.Failure });
    }
  }

  function deviceChoosen(device: Device) {
    setChosenDevice(device);
  }

  function getServiceItems(): ServiceItem[] {
    return [
      { name: "all", description: "Apply the action to all services" },
      { name: "calendar", description: "Allow access to calendar" },
      { name: "contacts-limited", description: "Allow access to basic contact info" },
      { name: "contacts", description: "Allow access to full contact details" },
      { name: "location", description: "Allow access to location services when app is in use" },
      { name: "location-always", description: "Allow access to location services at all times" },
      { name: "photos-add", description: "Allow adding photos to the photo library" },
      { name: "photos", description: "Allow full access to the photo library" },
      { name: "media-library", description: "Allow access to the media library" },
      { name: "microphone", description: "Allow access to audio input" },
      { name: "motion", description: "Allow access to motion and fitness data" },
      { name: "reminders", description: "Allow access to reminders" },
      { name: "siri", description: "Allow use of the app with Siri" },
    ];
  }
  function getPrivacyActions(): PrivacyAction[] {
    return [
      {
        name: "grant",
        description: "Grant access without prompting. Requires bundle identifier.",
        icon: Icon.Checkmark,
      },
      {
        name: "revoke",
        description: "Revoke access, denying all use of the service. Requires bundle identifier.",
        icon: Icon.MinusCircleFilled,
      },
      {
        name: "reset",
        description: "Reset access, prompting on next use. Bundle identifier optional.",
        icon: Icon.Repeat,
      },
    ];
  }
  return (
    <>
      {!chosenDevice && <Devices onDeviceChoose={deviceChoosen} />}

      {chosenDevice && (
        <Form
          actions={
            <ActionPanel>
              <Action.SubmitForm title="Execute" onSubmit={(values: Values) => handleSubmit(values)} />
            </ActionPanel>
          }
        >
          <Form.TextField id="bundleId" title="Bundle Identifier" placeholder="com.raycast" />

          <Form.Dropdown id="action" title="Action" defaultValue="grant">
            {getPrivacyActions().map((item) => {
              return (
                <Form.Dropdown.Item
                  key={item.name}
                  value={item.name}
                  title={`${item.name} - ${item.description}`}
                  icon={item.icon}
                />
              );
            })}
          </Form.Dropdown>

          <Form.Dropdown id="service" title="Service" defaultValue="all">
            {getServiceItems().map((item) => {
              return (
                <Form.Dropdown.Item key={item.name} value={item.name} title={`${item.name} - ${item.description}`} />
              );
            })}
          </Form.Dropdown>
        </Form>
      )}
    </>
  );
}

interface ServiceItem {
  name: string;
  description: string;
}

interface PrivacyAction {
  name: string;
  description: string;
  icon: Icon;
}
