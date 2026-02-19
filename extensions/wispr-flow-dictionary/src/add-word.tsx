import {
  Action,
  ActionPanel,
  Form,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { addWord, wordExists } from "./db";

export default function Command() {
  const [phraseError, setPhraseError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { phrase: string; replacement: string }) {
    const phrase = values.phrase.trim();
    const replacement = values.replacement?.trim();

    if (!phrase) {
      setPhraseError("Word or phrase is required");
      return;
    }

    setIsLoading(true);
    try {
      if (wordExists(phrase)) {
        setPhraseError("This word already exists in your dictionary");
        setIsLoading(false);
        return;
      }

      addWord(phrase, replacement || undefined);
      await showToast({
        style: Toast.Style.Success,
        title: "Word Added",
        message: `"${phrase}" added to Wispr Flow dictionary`,
      });
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add Word",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
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
          <Action.SubmitForm title="Add Word" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="phrase"
        title="Word or Phrase"
        placeholder="e.g., Anthropic, Claude, API"
        error={phraseError}
        onChange={() => {
          if (phraseError) {
            setPhraseError(undefined);
          }
        }}
      />
      <Form.TextField
        id="replacement"
        title="Replacement (Optional)"
        placeholder="Leave empty to use the word as-is"
        info="If set, Wispr Flow will substitute this text when the word is recognized"
      />
      <Form.Description text="Add a word or phrase that Wispr Flow should always recognize correctly. This is useful for names, technical terms, or custom vocabulary." />
    </Form>
  );
}
