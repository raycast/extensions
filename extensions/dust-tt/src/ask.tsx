import { Detail, LaunchProps } from "@raycast/api";
import { AskDustQuestion } from "./answerQuestion";
import { AskAgentQuestionForm, useGetSelectedText } from "./askAgent";
import { DUST_AGENT, AgentType } from "./utils";
import { withPickedWorkspace } from "./dust_api/oauth";

export default withPickedWorkspace(function AskDustCommand(
  props: LaunchProps<{ arguments: { search: string; agent?: AgentType } }>,
) {
  const question = props.arguments.search;
  const agent = props.arguments.agent || DUST_AGENT;
  const { selectedText, isLoading } = useGetSelectedText();

  if (question) {
    return <AskDustQuestion question={question} agent={agent} />;
  } else {
    if (isLoading) {
      return <Detail isLoading={true} />;
    } else {
      return <AskAgentQuestionForm initialQuestion={selectedText} agent={agent} />;
    }
  }
});
