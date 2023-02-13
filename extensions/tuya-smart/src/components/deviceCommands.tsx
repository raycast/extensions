import { Device, Function } from "../utils/interfaces";
import { CommandList } from "./list";

export function DeviceCommands(props: { device: Device; onAction: (device: Device) => void }): JSX.Element {
  const device = props.device;
  let commands: Function[];
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
