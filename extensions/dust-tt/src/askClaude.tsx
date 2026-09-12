import { LaunchProps } from "@raycast/api";
import AskDustCommand from "./ask";
import { withPickedWorkspace } from "./dust_api/oauth";

export default withPickedWorkspace(function AskGptCommand(props: LaunchProps<{ arguments: { search: string } }>) {
  const question = props.arguments.search;

  return (
    <AskDustCommand
      arguments={{
        search: question,
        agent: {
          sId: "claude-4-sonnet",
          name: "Claude 4",
          description: "Claude 4 is a general purpose assistant that can answer questions about anything.",
        },
      }}
      launchType={props.launchType}
    />
  );
});
