import { getHardwareInfo } from "../utils/hardware";

export default function Command() {
  return getHardwareInfo("serial_number", (value) => `Your Mac's serial number is ${value}`);
}
