import { LaunchProps } from "@raycast/api";
import { AskDustQuestion } from "./answerQuestion";
import { AgentType } from "./dust_api/agent";
import { AskAgentQuestionForm, useGetSelectedText } from "./askAgent";
import { DUST_AGENT } from "./agents";

export default function AskDustCommand(props: LaunchProps<{ arguments: { search: string; agent?: AgentType } }>) {
  const question = props.arguments.search;
  const agent = props.arguments.agent || DUST_AGENT;

  const selectedText = question ? undefined : useGetSelectedText();
  return question ? (
    <AskDustQuestion question={question} agent={agent} />
  ) : (
    <AskAgentQuestionForm initialQuestion={selectedText} agent={agent} />
  );
}
