import { getHardwareInfo } from "../utils/hardware";

export default function Command() {
  return getHardwareInfo("number_processors", (value) => `Your Mac has ${value} processors`);
}
