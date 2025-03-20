import { getSoftwareInfo } from "../utils/software";

export default function Command() {
  return getSoftwareInfo("secure_vm", (value) => `Your Mac's secure VM status is ${value}`);
}
