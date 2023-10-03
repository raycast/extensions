import { LaunchProps } from "@raycast/api";
import TeamView from "./views/team/TeamView";

export default function Command(props: LaunchProps<{ arguments: Arguments.Team }>) {
  const { teamId } = props.arguments;

  return <TeamView id={teamId} />;
}
