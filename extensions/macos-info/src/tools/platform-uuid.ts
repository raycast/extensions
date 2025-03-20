import { getHardwareInfo } from "../utils/hardware";

export default function Command() {
  return getHardwareInfo("platform_UUID", (value) => `Your Mac's platform UUID is ${value}`);
}
