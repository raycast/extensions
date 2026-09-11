import { Form, ActionPanel, Action, showToast, Toast, useNavigation, Icon } from "@raycast/api";
import { useState } from "react";
import { useRequiredFormField } from "../hooks/useRequiredFormField";
import { submitRequestCard } from "../lib/request-card";

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
  const wordField = useRequiredFormField("Word is required");
  const contextField = useRequiredFormField("Context is required");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: RequestCardFormValues) {
    const word = values.word.trim();
    const context = values.context.trim();

    // Reason: validate both fields before returning so the user sees every
    // missing field at once instead of fixing them one at a time.
    const isWordValid = wordField.validate(word);
    const isContextValid = contextField.validate(context);
    if (!isWordValid || !isContextValid) {
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
        error={wordField.error}
        onChange={wordField.handleChange}
        onBlur={wordField.handleBlur}
      />
      <Form.TextArea
        id="context"
        title="Context"
        placeholder="Add context or the meaning you want"
        error={contextField.error}
        onChange={contextField.handleChange}
        onBlur={contextField.handleBlur}
      />
    </Form>
  );
}
