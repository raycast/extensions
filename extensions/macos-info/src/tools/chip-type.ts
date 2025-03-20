import { getHardwareInfo } from "../utils/hardware";

export default function Command() {
  return getHardwareInfo("chip_type", (value) => `Your Mac has a ${value} chip`);
}
