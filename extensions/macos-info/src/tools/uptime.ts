import { getSoftwareInfo } from "../utils/software";

export default function Command() {
  return getSoftwareInfo("uptime", (value) => `Your Mac has been ${value}`);
}
