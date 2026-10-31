import type { LaunchProps } from "@raycast/api";
import { SessionCommand } from "./sessions.js";
import type { Context } from "./sessions.js";

export default function Recent(props: LaunchProps<{ launchContext: Context }>) {
  return <SessionCommand {...props.launchContext} recent />;
}
