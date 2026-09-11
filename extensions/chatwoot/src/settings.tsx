import { LaunchProps } from "@raycast/api";
import ListCannedResponses from "./views/list-canned-responses";
import ListTeams from "./views/list-teams";

export default function Settings(props: LaunchProps<{ arguments: Arguments.Settings }>) {
  if (props.arguments.view === "canned_responses") return <ListCannedResponses />;
  else if (props.arguments.view === "teams") return <ListTeams />;
}
