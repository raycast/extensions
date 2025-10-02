import { Action, ActionPanel, Form, useNavigation, TextArea } from "@raycast/api";
import { useState, useRef } from "react";
import { ModelDropdown } from "./components/models-dropdown";
import { Conversation } from "./components/conversation";

export default function Command() {
  const [question, setQuestion] = useState("");
  const { push } = useNavigation();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextChange = (value: string) => {
    setQuestion(value);
    if (textAreaRef.current) {
      textAreaRef.current.style.height = 'auto';
      textAreaRef.current.style.height = Math.min(textAreaRef.current.scrollHeight, 200) + 'px';
    }
  };

  async function handleSubmit() {
    if (question.length) {
      const newConversation = {
        id: Math.random().toString(36).slice(7),
        title: question,
        date: new Date().toString(),
        chats: [{ question, answer: "" }],
      };
      push(<Conversation conversation={newConversation} />);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitAction title="Ask" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        value={question}
        onChange={handleTextChange}
        placeholder="Ask Mistral..."
        ref={textAreaRef}
        enableMultiline={true}
        style={{ resize: "none", minHeight: "40px", maxHeight: "200px", overflowY: "auto" }}
      />
      <Form.Description text="Select model via dropdown if needed" />
    </Form>
  );
}
