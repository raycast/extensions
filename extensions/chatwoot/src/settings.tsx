import { LaunchProps } from "@raycast/api";
import CannedResponses from "./views/canned-responses";
import Teams from "./views/teams";

export default function Settings(props: LaunchProps<{ arguments: Arguments.Settings }>) {
  if (props.arguments.view === "canned_responses") return <CannedResponses />;
  else if (props.arguments.view === "teams") return <Teams />;
}
