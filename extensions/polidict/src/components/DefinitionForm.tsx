import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { createApiClient } from "../api";
import { FIELD_LIMITS, MAX_EXAMPLES_PER_DEFINITION } from "../constants";
import type { ItemDefinition, SupportedLanguage } from "../types";
import { formatRaycastError } from "../utils";

interface DefinitionFormProps {
  definition?: ItemDefinition;
  onSave: (definition: ItemDefinition) => void;
  text?: string;
  currentLanguage?: SupportedLanguage;
  hasAIAccess?: boolean;
}

export function DefinitionForm({ definition, onSave, text, currentLanguage, hasAIAccess }: DefinitionFormProps) {
  const { pop } = useNavigation();

  const [definitionText, setDefinitionText] = useState(definition?.definition ?? "");
  const [translation, setTranslation] = useState(definition?.translation ?? "");
  const [comment, setComment] = useState(definition?.comment ?? "");
  const [examplesText, setExamplesText] = useState(definition?.examples?.join("\n") ?? "");
  const [isSuggestingExample, setIsSuggestingExample] = useState(false);

  const canSuggestExample = hasAIAccess && text && text.length >= 2 && currentLanguage && definitionText.length > 0;

  async function handleSuggestExample() {
    if (!text || !currentLanguage || isSuggestingExample) return;

    setIsSuggestingExample(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating example...",
    });

    try {
      const client = createApiClient();
      const currentDef = {
        definition: definitionText,
        translation: translation || undefined,
        comment: comment || undefined,
        examples: examplesText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      };
      const response = await client.suggestions.getSuggestion(currentLanguage, {
        text,
        definitions: [currentDef],
        suggestionTarget: { type: "EXAMPLE", definitionIndex: 0 },
      });

      const example = response?.definitions?.[0]?.examples?.[0];
      if (!example) {
        toast.style = Toast.Style.Failure;
        toast.title = "Suggestion failed, try again";
        return;
      }

      const current = examplesText.trim();
      setExamplesText(current ? `${current}\n${example}` : example);
      toast.style = Toast.Style.Success;
      toast.title = "Example added";
    } catch (error) {
      const userError = formatRaycastError(error);
      toast.style = Toast.Style.Failure;
      toast.title = userError.title;
      toast.message = userError.description;
    } finally {
      setIsSuggestingExample(false);
    }
  }

  const definitionError =
    definitionText.length > FIELD_LIMITS.DEFINITION_MAX ? `Max ${FIELD_LIMITS.DEFINITION_MAX} characters` : undefined;
  const translationError =
    translation.length > FIELD_LIMITS.TRANSLATION_MAX ? `Max ${FIELD_LIMITS.TRANSLATION_MAX} characters` : undefined;
  const commentError =
    comment.length > FIELD_LIMITS.DEFINITION_COMMENT_MAX
      ? `Max ${FIELD_LIMITS.DEFINITION_COMMENT_MAX} characters`
      : undefined;
  const examples = examplesText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const examplesError =
    examples.length > MAX_EXAMPLES_PER_DEFINITION
      ? `Max ${MAX_EXAMPLES_PER_DEFINITION} examples`
      : examples.some((ex) => ex.length > FIELD_LIMITS.EXAMPLE_MAX)
        ? `Each example max ${FIELD_LIMITS.EXAMPLE_MAX} characters`
        : undefined;

  function handleSubmit() {
    if (definitionError || translationError || commentError || examplesError) return;

    const saved: ItemDefinition = {
      id: definition?.id,
      definition: definitionText || undefined,
      translation: translation || undefined,
      comment: comment || undefined,
      examples: examples.length > 0 ? examples : undefined,
    };

    onSave(saved);
    pop();
  }

  return (
    <Form
      navigationTitle={definition ? "Edit Definition" : "Add Definition"}
      isLoading={isSuggestingExample}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Definition" onSubmit={handleSubmit} />
          {canSuggestExample && (
            <Action
              title="Suggest Example"
              icon={Icon.Wand}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={handleSuggestExample}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="definition"
        title="Definition"
        placeholder="Enter definition text"
        value={definitionText}
        onChange={setDefinitionText}
        error={definitionError}
        autoFocus
      />

      <Form.TextField
        id="translation"
        title="Translation"
        placeholder="Enter translation"
        value={translation}
        onChange={setTranslation}
        error={translationError}
      />

      <Form.TextArea
        id="comment"
        title="Comment"
        placeholder="Optional comment or note"
        value={comment}
        onChange={setComment}
        error={commentError}
      />

      <Form.TextArea
        id="examples"
        title="Examples"
        placeholder="One example per line"
        value={examplesText}
        onChange={setExamplesText}
        error={examplesError}
      />
    </Form>
  );
}
