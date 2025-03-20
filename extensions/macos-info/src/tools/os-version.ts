import { getSoftwareInfo } from "../utils/software";

export default function Command() {
  return getSoftwareInfo("os_version", (value) => `Your macOS version is ${value}`);
}
