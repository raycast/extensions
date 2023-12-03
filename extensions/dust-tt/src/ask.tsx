import { LaunchProps } from "@raycast/api";
import { AskDustQuestion } from "./answerQuestion";
import { AgentType } from "./dust_api/agent";
import { AskAgentQuestionForm } from "./askAgent";
import { DUST_AGENT } from "./agents";

export default function AskDustCommand(props: LaunchProps<{ arguments: { search: string; agent?: AgentType } }>) {
  const question = props.arguments.search;
  const agent = props.arguments.agent;

  return question ? <AskDustQuestion question={question} agent={agent} /> : <AskAgentQuestionForm agent={DUST_AGENT} />;
}
