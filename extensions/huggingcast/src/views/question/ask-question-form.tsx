/**
 * AskQuestionForm Component
 *
 * This file defines a form-based "rich text" interface for users to interact with the Hugging Face API.
 * It allows users to input a question, sends the question to the API, and redirects back to the given conversation in chat.tsx.
 *
 */

import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { FormValidation, useForm } from "@raycast/utils";
import { Question } from "../../types/question";

interface AskQuestionFormValues {
  question: string;
}

interface AskQuestionFormProps {
  initialQuestion: Question;
  onQuestionSubmit: (question: Question) => Promise<void>;
}

export default function AskQuestionForm({ initialQuestion, onQuestionSubmit }: AskQuestionFormProps) {
  const { pop } = useNavigation();
  const [loading, setLoading] = useState<boolean>(false);

  const { handleSubmit, itemProps } = useForm<AskQuestionFormValues>({
    onSubmit(values) {
      if (loading) return; // Prevent duplicate submissions
      handleGenerateResponse(values.question);
    },
    initialValues: {
      question: initialQuestion.prompt,
    },
    validation: {
      question: FormValidation.Required,
    },
  });

  const handleGenerateResponse = async (question: string) => {
    setLoading(true);
    try {
      const newQuestion = {
        ...initialQuestion,
        prompt: question,
        isStreaming: true,
      };
      pop(); // Redirect back to Chat
      await onQuestionSubmit(newQuestion);
    } catch (error) {
      console.error("Error in handleGenerateResponse:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Chat" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={loading}
    >
      <Form.TextArea
        title="Question"
        placeholder="Enter a question to chat with Hugging Face..."
        {...itemProps.question}
      />
    </Form>
  );
}
