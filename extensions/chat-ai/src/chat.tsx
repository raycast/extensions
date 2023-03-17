import { showToast, Toast, popToRoot, Form, ActionPanel, Action } from "@raycast/api";
import { generateAnswer } from "./api";
import { useState } from "react";

type ChatProps = {
  promptField: string;
};

export default function Chat() {
  const [prompt, setPrompt] = useState("");
  // const [answer, setAnswer] = useState<string>("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [isLoding, setIsLoading] = useState(false);

  async function fetchAnswer(prompt: string) {
    setIsLoading(true);
    try {
      const response = await generateAnswer(prompt);
      // setAnswer(response as string);
      setAnswers((prev) => [response as string, ...prev]);
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
      {/* {answer.length > 0 && (
          <Form.Description text={answer} />
      )} */}
      {answers.length > 0 && answers.map((answer, index) => <Form.Description key={index} text={answer} />)}
    </Form>
  );
}
