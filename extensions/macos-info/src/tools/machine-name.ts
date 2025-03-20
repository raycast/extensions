import { getHardwareInfo } from "../utils/hardware";

export default function Command() {
  return getHardwareInfo("machine_name", (value) => `Your Mac's machine name is ${value}`);
}
