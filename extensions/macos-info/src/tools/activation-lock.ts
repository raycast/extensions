import { getHardwareInfo } from "../utils/hardware";

export default function Command() {
  return getHardwareInfo("activation_lock_status", (value) => `Your Mac's activation lock status is ${value}`);
}
