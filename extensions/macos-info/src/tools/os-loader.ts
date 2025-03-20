import { getHardwareInfo } from "../utils/hardware";

export default function Command() {
  return getHardwareInfo("os_loader_version", (value) => `Your Mac's OS loader version is ${value}`);
}
