import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { askPortAI, PortAIResponse } from "./api/port-client";

function AIResponseView({
  question,
  response,
  onAskAnother,
}: {
  question: string;
  response: PortAIResponse;
  onAskAnother: () => void;
}) {
  const markdown = `# Port AI Response

## Question
> ${question}

## Answer
${response.answer}

${
  response.references && response.references.length > 0
    ? `
## References
${response.references.map((ref) => (ref.url ? `- [${ref.title}](${ref.url})` : `- ${ref.title}`)).join("\n")}
`
    : ""
}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Ask Another Question" icon={Icon.Message} onAction={onAskAnother} />
            <Action.CopyToClipboard
              title="Copy Answer"
              content={response.answer}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Full Response"
              content={markdown}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function AskPortAI() {
  const [isLoading, setIsLoading] = useState(false);
  const { push, pop } = useNavigation();

  async function handleSubmit(values: { question: string }) {
    if (!values.question.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please enter a question",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await askPortAI(values.question);
      push(
        <AIResponseView
          question={values.question}
          response={result}
          onAskAnother={() => {
            pop();
          }}
        />,
      );
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to get response",
        message: error instanceof Error ? error.message : "Unknown error",
        primaryAction: {
          title: "Open Preferences",
          onAction: () => openExtensionPreferences(),
        },
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask Port AI" icon={Icon.Message} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="Ask Port AI about your services, deployments, incidents, or anything in your catalog..."
        enableMarkdown={false}
        autoFocus
      />
      <Form.Description
        title=""
        text="Port AI can help you understand your software catalog, find services, check deployment status, investigate incidents, and more."
      />
    </Form>
  );
}
