import { getHardwareInfo } from "../utils/hardware";

export default function Command() {
  return getHardwareInfo("machine_model", (value) => `Your Mac's model is ${value}`);
}
