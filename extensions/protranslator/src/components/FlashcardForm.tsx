import {
  Form,
  ActionPanel,
  Action,
  useNavigation,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useFlashcards } from "../utils/flashcardUtil";
import { Flashcard } from "../types";

interface FlashcardFormProps {
  initialTerm?: string;
  initialDefinition?: string;
  initialExample?: string;
}

export default function FlashcardForm({
  initialTerm = "",
  initialDefinition = "",
  initialExample = "",
}: FlashcardFormProps) {
  const { pop } = useNavigation();
  const { add } = useFlashcards();

  const [termError, setTermError] = useState<string | undefined>();
  const [definitionError, setDefinitionError] = useState<string | undefined>();

  async function handleSubmit(values: {
    term: string;
    definition: string;
    example: string;
  }) {
    if (!values.term.trim()) {
      setTermError("Term is required");
      return;
    }
    if (!values.definition.trim()) {
      setDefinitionError("Definition is required");
      return;
    }

    const card: Flashcard = {
      id: uuidv4(),
      term: values.term.trim(),
      definition: values.definition.trim(),
      example: values.example.trim(),
      createdAt: new Date().toISOString(),
      correctCount: 0,
      wrongCount: 0,
      interval: 0,
      easeFactor: 2.5,
      dueDate: new Date().toISOString(),
    };

    await add(card);
    await showToast({
      style: Toast.Style.Success,
      title: "Saved to Flashcards",
    });
    pop(); // Return to previous screen
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Flashcard" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Extract vocabulary or a sentence to practice later." />
      <Form.TextArea
        id="term"
        title="Term / Vocabulary"
        placeholder="e.g. apple, how are you, etc."
        defaultValue={initialTerm}
        error={termError}
        onChange={() => setTermError(undefined)}
      />
      <Form.TextArea
        id="definition"
        title="Definition / Meaning"
        placeholder="e.g. quả táo, bạn khỏe không, etc."
        defaultValue={initialDefinition}
        error={definitionError}
        onChange={() => setDefinitionError(undefined)}
      />
      <Form.TextArea
        id="example"
        title="Example (Optional)"
        placeholder="e.g. I ate an apple today."
        defaultValue={initialExample}
      />
    </Form>
  );
}
