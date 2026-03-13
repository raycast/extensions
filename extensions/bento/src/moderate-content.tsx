import React, { useState } from "react";
import { Action, ActionPanel, Form, useNavigation, showToast, Toast, Detail } from "@raycast/api";
import { moderateContent, ModerationResponse } from "./api-client";

interface FormValues {
  content: string;
}

interface ModerationResult extends ModerationResponse {
  original_content: string;
}

export default function ModerateContent() {
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  const handleSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const apiResult = await moderateContent(values.content);
      const result: ModerationResult = {
        ...apiResult,
        original_content: values.content,
      };
      push(<ResultView result={result} />);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="content" title="Content" placeholder="Enter content to moderate" />
    </Form>
  );
}

function ResultView({ result }: { result: ModerationResult }) {
  const categoriesSection =
    result.categories && result.categories.length > 0
      ? `Categories:\n${result.categories.map((category) => `- ${category}`).join("\n")}`
      : "No specific issues found.";

  const markdown = `
# Content Moderation Result

Flagged: ${result.flagged ? "Yes" : "No"}

${categoriesSection}

Original Content:
\`\`\`
${result.original_content}
\`\`\`
  `;

  return <Detail markdown={markdown} />;
}
