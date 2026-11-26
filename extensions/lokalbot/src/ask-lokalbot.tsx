import type { LaunchProps } from "@raycast/api";
import { useState } from "react";
import { AnswerView } from "./answer-view";
import { useLokalBotAnswer } from "./use-lokalbot-answer";

export default function Command(
  props: LaunchProps<{ arguments: { question: string } }>,
) {
  const question = props.arguments.question.trim();
  const [revision, setRevision] = useState(0);
  const state = useLokalBotAnswer(
    question ? { args: ["ask", question] } : null,
    revision,
  );

  return (
    <AnswerView
      state={state}
      loadingMarkdown={`## ${question}\n\nAsking LokalBot… The first question after LokalBot starts can take up to a minute while its local model loads.`}
      labels={[{ title: "Question", text: question }]}
      resultActions={[
        { kind: "copy", title: "Copy Answer" },
        { kind: "paste", title: "Paste Answer" },
      ]}
      retry={() => setRevision((value) => value + 1)}
    />
  );
}
