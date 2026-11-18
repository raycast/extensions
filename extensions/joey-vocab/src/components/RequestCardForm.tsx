import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useState } from "react";
import { submitRequestCard } from "../lib/request-card";

const WORD_REQUIRED_ERROR = "Word is required";
const CONTEXT_REQUIRED_ERROR = "Context is required";

type RequestCardFormValues = {
  word: string;
  context: string;
};

/**
 * Form for requesting a missing card. Both word and context are required.
 * Opened when a search yields no results.
 */
export function RequestCardForm({ userId, initialWord }: { userId: string; initialWord?: string }) {
  const { pop } = useNavigation();
  const [wordError, setWordError] = useState<string | undefined>();
  const [contextError, setContextError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: RequestCardFormValues) {
    const word = values.word.trim();
    const context = values.context.trim();

    let hasValidationError = false;
    if (!word) {
      setWordError(WORD_REQUIRED_ERROR);
      hasValidationError = true;
    }
    if (!context) {
      setContextError(CONTEXT_REQUIRED_ERROR);
      hasValidationError = true;
    }
    if (hasValidationError) {
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Requesting card..." });

    const result = await submitRequestCard(userId, { word, context });

    if (result.success) {
      toast.style = Toast.Style.Success;
      toast.title = "Card requested";
      toast.message = `"${word}" has been submitted`;
      pop();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to request card";
      toast.message = result.error;
    }
    setIsSubmitting(false);
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Request Card" icon={Icon.PlusCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="word"
        title="Word"
        placeholder="Enter the word"
        defaultValue={initialWord}
        error={wordError}
        onChange={() => wordError && setWordError(undefined)}
        onBlur={(event) => {
          if (!event.target.value?.trim()) {
            setWordError(WORD_REQUIRED_ERROR);
          }
        }}
      />
      <Form.TextArea
        id="context"
        title="Context"
        placeholder="Add context or the meaning you want"
        error={contextError}
        onChange={() => contextError && setContextError(undefined)}
        onBlur={(event) => {
          if (!event.target.value?.trim()) {
            setContextError(CONTEXT_REQUIRED_ERROR);
          }
        }}
      />
    </Form>
  );
}
