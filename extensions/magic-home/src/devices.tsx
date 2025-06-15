import { Action, ActionPanel, Form, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";

import { useEffect, useState } from "react";
import { Device } from "../types/device";
import { Control } from "magic-home";
import Style = Toast.Style;
import { useForm } from "@raycast/utils";
import { getRGBValues } from "./utils";

async function loadAllFromStorage() {
  const devices = await LocalStorage.allItems();
  return Object.keys(devices)
    .filter((key) => !key.includes("default-device"))
    .map((key) => JSON.parse(devices[key]));
}

async function handleDevicePower(deviceControl: Control, power: boolean) {
  await deviceControl.setPower(power);
  await showToast({ title: `The device has been turned ${power ? "on" : "off"}`, style: Style.Success });
}

async function setDefaultDevice(address: string) {
  await LocalStorage.setItem("default-device", address);
  await showToast({
    title: "Device set up as default device",
    message: "Now you can control it through the direct extension commands",
    style: Style.Success,
  });
}

function Actions(props: { item: Device }) {
  const deviceControl = new Control(props.item.address);
  return (
    <ActionPanel title={props.item.model}>
      <ActionPanel.Section>
        <Action title={"Power On"} onAction={() => handleDevicePower(deviceControl, true)} icon={Icon.Power}></Action>
        <Action title={"Power Off"} onAction={() => handleDevicePower(deviceControl, false)} icon={Icon.Power}></Action>
        <Action.Push title="Set Custom Color" target={<ColorPicker device={deviceControl} />} icon={Icon.EyeDropper} />
        <Action
          title={"Set as Default Device"}
          onAction={() => setDefaultDevice(props.item.address)}
          icon={Icon.Heart}
        ></Action>
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function ColorPicker({ device }: { device: Control }) {
  const { handleSubmit, itemProps } = useForm<{ hexCode: string }>({
    async onSubmit(values) {
      const { red, green, blue } = getRGBValues(values.hexCode);
      console.log(`Trying to set color to ${red}, ${green}, ${blue}`);
      try {
        await device.setColor(red, green, blue);
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Oops!",
          message: `Something went wrong. Please try again.`,
        });
      }
      await showToast({
        style: Toast.Style.Success,
        title: "Yay!",
        message: `Color set to ${values.hexCode}`,
      });
    },
    validation: {
      hexCode: (value) => {
        const hexPattern = /^#([0-9A-Fa-f]{3}){1,2}$/;

        if (!value) {
          return "HEX code is required";
        } else if (!hexPattern.test(value)) {
          return "Please enter a valid HEX color code";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="HEX color code"
        info={"Supports both 3 or 6 characters"}
        placeholder="#ffffff"
        {...itemProps.hexCode}
      />
    </Form>
  );
}

export default function Command() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadAllFromStorage().then((dvs) => {
      setDevices(dvs);
      setLoading(false);
    });
  }, []);

  return (
    <List isLoading={loading}>
      {devices?.map((item, index) => (
        <List.Item
          key={index}
          title={item.id}
          subtitle={`Model ${item.model}`}
          icon={Icon.Devices}
          actions={<Actions item={item} />}
        />
      ))}
    </List>
  );
}
