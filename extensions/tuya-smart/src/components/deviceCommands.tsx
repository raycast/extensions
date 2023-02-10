import { stat } from "fs";
import { Device, Status } from "../utils/interfaces";
import { CommandList } from "./list";

export function DeviceCommands(props: { device: Device }): JSX.Element {
  const device = props.device;
  let commands: Status[];
  switch (device.category) {
    case "Switch":
    case "kg":
    case "Socket": {
      commands = device.status.filter((status) => status.code.includes("switch"));
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
      console.log(device.status, device.id);
      return <></>;
      break;
  }

  return <CommandList commands={commands} device={device} onAction={() => {}} />;
}
