import { LaunchProps } from "@raycast/api";
import { AskDustQuestion } from "./answerQuestion";

export default function AskDustCommand(props: LaunchProps<{ arguments: { search: string } }>) {
  const question = props.arguments.search;

  return (
    <AskDustQuestion
      question={question}
      agent={{
        sId: "gpt-4",
        name: "GPT-4",
        description: "GPT-4 is a general purpose agent that can answer questions about anything.",
      }}
    />
  );
}
