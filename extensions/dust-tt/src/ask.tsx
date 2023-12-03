import { getSelectedText, LaunchProps, showToast, Toast } from "@raycast/api";
import { AskDustQuestion } from "./answerQuestion";
import { AgentType } from "./dust_api/agent";
import { AskAgentQuestionForm } from "./askAgent";
import { DUST_AGENT } from "./agents";
import { useEffect, useState } from "react";

export default function AskDustCommand(props: LaunchProps<{ arguments: { search: string; agent?: AgentType } }>) {
  const question = props.arguments.search;
  const agent = props.arguments.agent || DUST_AGENT;
  const [selectedText, setSelectedText] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (question) {
      return;
    }
    async function fetchHighlightedText() {
      try {
        const text = await getSelectedText();
        setSelectedText(text);
      } catch (error) {
        showToast(Toast.Style.Failure, "Could not get highlighted text");
      }
    }
    fetchHighlightedText();
  }, []);

  return question ? (
    <AskDustQuestion question={question} agent={agent} />
  ) : (
    <AskAgentQuestionForm initialQuestion={selectedText} agent={agent} />
  );
}
