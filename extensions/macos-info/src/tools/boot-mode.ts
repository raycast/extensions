import { getSoftwareInfo } from "../utils/software";

export default function Command() {
  return getSoftwareInfo("boot_mode", (value) => `Your Mac's boot mode is ${value}`);
}
