import { getHardwareInfo } from "../utils/hardware";

export default function Command() {
  return getHardwareInfo("model_number", (value) => `Your Mac's model number is ${value}`);
}
