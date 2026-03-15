import { Action, ActionPanel, Detail, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";

import { askQuestion } from "../utils/codex";
import type { Model } from "../utils/models";

type AnswerDetailProps = {
  question: string;
  model: Model;
};

export function AnswerDetail({ question, model }: AnswerDetailProps) {
  const { pop } = useNavigation();
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAnswer() {
      try {
        const answer = await askQuestion(question, model);
        setAnswer(answer);
      } finally {
        setIsLoading(false);
      }
    }
    loadAnswer();
  }, [model, question]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={buildMarkdown(question, model, answer)}
      navigationTitle="Answer"
      actions={
        <ActionPanel>
          {answer ? <Action.CopyToClipboard content={answer} title="Copy Answer" /> : null}
          <Action.CopyToClipboard content={question} title="Copy Question" />
          <Action title="Ask Another Question" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

function buildMarkdown(question: string, model: Model, answer: string) {
  if (!answer) {
    return `# Thinking\n\n## Model\n\n${model}\n\n## Question\n\n${question}`;
  }

  return `# Answer\n\n## Model\n\n${model}\n\n## Question\n\n${question}\n\n## Response\n\n${answer}`;
}
