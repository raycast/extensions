import { getSoftwareInfo } from "../utils/software";

export default function Command() {
  return getSoftwareInfo("user_name", (value) => `Current user is ${value}`);
}
