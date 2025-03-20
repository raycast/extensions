import { getSoftwareInfo } from "../utils/software";

export default function Command() {
  return getSoftwareInfo("boot_volume", (value) => `Your Mac's boot volume is ${value}`);
}
