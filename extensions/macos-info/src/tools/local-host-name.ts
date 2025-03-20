import { getSoftwareInfo } from "../utils/software";

export default function Command() {
  return getSoftwareInfo("local_host_name", (value) => `Your Mac's local host name is ${value}`);
}
