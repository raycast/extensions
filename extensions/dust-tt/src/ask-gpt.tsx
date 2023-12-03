import { LaunchProps } from "@raycast/api";
import AskDustCommand from "./ask";

export default function AskGptCommand(props: LaunchProps<{ arguments: { search: string } }>) {
  const question = props.arguments.search;

  return (
    <AskDustCommand
      arguments={{
        search: question,
        agent: {
          sId: "gpt-4",
          name: "GPT-4",
          description: "GPT-4 is a general purpose agent that can answer questions about anything.",
        },
      }}
      launchType={props.launchType}
    />
  );
}
