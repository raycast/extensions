import { getSoftwareInfo } from "../utils/software";

export default function Command() {
  return getSoftwareInfo("system_integrity", (value) => `Your Mac's system integrity status is ${value}`);
}
