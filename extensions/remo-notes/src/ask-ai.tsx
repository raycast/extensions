import { Action, ActionPanel, Detail, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { buildAppUrl } from "./config";
import type { AskAiResponse } from "./types";
import { remoApi } from "./utils/api";
import { handleError } from "./utils/errors";
import { stripHtml } from "./utils/stripHtml";

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  async function handleSubmit(values: { question: string }) {
    if (!values.question.trim()) return;

    setIsLoading(true);

    try {
      const result = await remoApi.askAi(values.question);
      push(<AnswerView question={values.question} result={result} />);
    } catch (error) {
      handleError(error, "AI Search failed");
      push(
        <AnswerView
          question={values.question}
          result={{
            answer: "Failed to get an answer. Please check your settings and try again.",
            citations: [],
            matches: [],
          }}
        />,
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask AI" onSubmit={handleSubmit} icon={Icon.Stars} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="What did I decide about the project roadmap?"
        enableMarkdown
      />
      <Form.Description text="🔒 Locked notes are excluded from AI search and source list." />
    </Form>
  );
}

function buildSourcesMarkdown(matches: AskAiResponse["matches"]) {
  if (matches.length === 0) {
    return "";
  }

  const rows = matches.map((match) => {
    const score = Math.round(match.score * 100);
    const webUrl = buildAppUrl(`/notes/${match.noteId}`);
    const title = match.title || "Untitled";
    const snippet = stripHtml(match.snippet || "") || "_No preview available._";
    return `- [${match.sourceIndex}] [${title}](${webUrl}) (${score}%)\n  ${snippet}`;
  });

  return `\n\n## Sources\n${rows.join("\n")}`;
}

function AnswerView({ question, result }: { question: string; result: AskAiResponse }) {
  const markdown = `# Q: ${question}\n\n${result.answer}${buildSourcesMarkdown(result.matches)}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={result.answer} title="Copy Answer" />
        </ActionPanel>
      }
    />
  );
}
