import { Detail, LaunchProps } from "@raycast/api";
import { AskDustQuestion } from "./answerQuestion";
import { AgentType } from "./dust_api/agent";
import { AskAgentQuestionForm, useGetSelectedText } from "./askAgent";
import { DUST_AGENT } from "./agents";

export default function AskDustCommand(props: LaunchProps<{ arguments: { search: string; agent?: AgentType } }>) {
  const question = props.arguments.search;
  const agent = props.arguments.agent || DUST_AGENT;
  const { selectedText, isLoading } = useGetSelectedText();

  if (isLoading) {
    return <Detail isLoading={true} />;
  }

  const initialQuestion = question ? undefined : selectedText;
  return question ? (
    <AskDustQuestion question={question} agent={agent} />
  ) : (
    <AskAgentQuestionForm initialQuestion={initialQuestion} agent={agent} />
  );
}
