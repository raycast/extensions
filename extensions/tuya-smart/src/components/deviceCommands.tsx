import { Device, FunctionItem } from "../utils/interfaces";
import { CommandList } from "./list";

export function DeviceCommands(props: { device: Device; onAction: (device: Device) => void }): JSX.Element {
  const device = props.device;
  let commands: FunctionItem[];
  switch (device.category) {
    case "Switch":
    case "kg":
    case "Socket": {
      commands = device.status.filter((status) => status.type === "Boolean");
      break;
    }
    case "cl":
    case "Curtain": {
      commands = [
        { code: "control", value: "open", name: "Open" },
        { code: "control", value: "close", name: "Close" },
        { code: "control", value: "stop", name: "Stop" },
      ];
      break;
    }
    case "dj":
    case "Light Source": {
      commands = [
        {
          code: "switch_led",
          value: device.status.find((status) => status.code === "switch_led")?.value,
          name: "Toggle On/Off",
        },
        { code: "work_mode", value: "white", name: "Workmode: White" },
        { code: "work_mode", value: "colour", name: "Workmode: Colour" },
        { code: "work_mode", value: "scene", name: "Workmode: Scene" },
        { code: "work_mode", value: "music", name: "Workmode: Music" },
      ];
      break;
    }
    default:
      return <></>;
  }

  return (
    <CommandList
      commands={commands}
      device={device}
      onAction={(device) => {
        props.onAction(device);
      }}
    />
  );
}
