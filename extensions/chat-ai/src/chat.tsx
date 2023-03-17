import { Detail, showToast, Toast, popToRoot, Form, ActionPanel, Action } from "@raycast/api";
import { generateAnswer } from "./api";
import { useEffect, useState } from "react";

type ChatProps = {
  promptField: string;
};

export default function Chat() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState<string>("");
  const [isLoding, setIsLoading] = useState(false);

  async function fetchAnswer(prompt: string) {
    setIsLoading(true);
    try {
      const response = await generateAnswer(prompt);
      setAnswer(response as string);
    } catch (error) {
      if (error instanceof Error) {
        showToast(Toast.Style.Failure, "Error", "Invalid openai api key");
        popToRoot();
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoding}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: ChatProps) => {
              fetchAnswer(values.promptField);
              setPrompt("");
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="promptField"
        title="Chat"
        placeholder="Ask your question here..."
        value={prompt}
        onChange={setPrompt}
      />
      {answer.length > 0 && <Form.Description text={answer} />}
    </Form>
  );
}
