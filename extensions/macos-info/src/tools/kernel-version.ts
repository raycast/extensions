import { getSoftwareInfo } from "../utils/software";

export default function Command() {
  return getSoftwareInfo("kernel_version", (value) => `Your Mac's kernel version is ${value}`);
}
