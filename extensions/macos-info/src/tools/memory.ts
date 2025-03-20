import { getHardwareInfo } from "../utils/hardware";

export default function Command() {
  return getHardwareInfo("physical_memory", (value) => `Your Mac has ${value} of physical memory`);
}
