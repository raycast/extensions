import { getHardwareInfo } from "../utils/hardware";

export default function Command() {
  return getHardwareInfo("provisioning_UDID", (value) => `Your Mac's provisioning UDID is ${value}`);
}
