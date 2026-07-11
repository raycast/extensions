import { LaunchProps } from "@raycast/api";
import getBase from "./base";

export default function Command(props: LaunchProps) {
  return getBase(props, "polishing");
}
