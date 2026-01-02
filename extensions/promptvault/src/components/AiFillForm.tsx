import React, { useState } from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  Clipboard,
  popToRoot,
  Icon,
  showHUD,
  useNavigation,
} from "@raycast/api";
import { aiFillPrompt, fillPrompt, type AiFillMode } from "../api";
import type { PromptDetail } from "../types";

type AiFillFormProps = {
  prompt: PromptDetail;
  variables: string[];
};

export function AiFillForm({ prompt, variables }: AiFillFormProps) {
  const [description, setDescription] = useState("");
  const [guessAll, setGuessAll] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  const handleSubmit = async () => {
    if (!description.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Description requise",
        message: "Decrivez ce que vous voulez faire",
      });
      return;
    }

    setIsLoading(true);

    try {
      const mode: AiFillMode = guessAll ? "guess_all" : "null_if_unsure";
      const result = await aiFillPrompt(prompt.slug, description, mode);

      // Count filled vs empty
      const filled = Object.values(result.variables).filter(
        (v) => v !== null,
      ).length;
      const total = Object.keys(result.variables).length;

      // Check if all variables were filled
      const allFilled = filled === total;

      if (allFilled) {
        // All filled - copy directly
        const variableValues: Record<string, string> = {};
        for (const [key, value] of Object.entries(result.variables)) {
          if (value !== null) {
            variableValues[key] = value;
          }
        }

        const fillResult = await fillPrompt(prompt.slug, variableValues);
        await Clipboard.copy(fillResult.filledContent);
        await showHUD(`Copied "${prompt.name}" (${filled}/${total} variables)`);
        await popToRoot();
      } else {
        // Some variables missing - show form with pre-filled values
        await showToast({
          style: Toast.Style.Success,
          title: `${filled}/${total} variables remplies`,
          message: "Completez les variables manquantes",
        });

        // Navigate to VariableForm with pre-filled values
        push(
          <VariableFormWithAiValues
            prompt={prompt}
            variables={variables}
            aiValues={result.variables}
          />,
        );
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Erreur AI Fill",
        message:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'extraction",
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
          <Action.SubmitForm
            title="Extraire les variables"
            onSubmit={handleSubmit}
            icon={Icon.Wand}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Prompt" text={prompt.name} />

      <Form.TextArea
        id="description"
        title="Description"
        placeholder="Ex: analyse mon-site.com pour react hooks, compare avec dev.to"
        value={description}
        onChange={setDescription}
        info="Decrivez ce que vous voulez faire, l'IA remplira les variables"
      />

      <Form.Checkbox
        id="guessAll"
        label="Devinez tout (meme si info absente)"
        value={guessAll}
        onChange={setGuessAll}
        info="Si active, l'IA inventera des valeurs plausibles pour les variables manquantes"
      />
    </Form>
  );
}

/**
 * VariableForm with AI pre-filled values
 * Shows empty variables first with warning
 */
type VariableFormWithAiValuesProps = {
  prompt: PromptDetail;
  variables: string[];
  aiValues: Record<string, string | null>;
};

function VariableFormWithAiValues({
  prompt,
  variables,
  aiValues,
}: VariableFormWithAiValuesProps) {
  // Sort variables: empty ones first
  const sortedVariables = [...variables].sort((a, b) => {
    const aEmpty = aiValues[a] === null;
    const bEmpty = aiValues[b] === null;
    if (aEmpty && !bEmpty) return -1;
    if (!aEmpty && bEmpty) return 1;
    return 0;
  });

  // Initial values from AI
  const initialValues: Record<string, string> = {};
  for (const [key, value] of Object.entries(aiValues)) {
    if (value !== null) {
      initialValues[key] = value;
    }
  }

  const [variableValues, setVariableValues] =
    useState<Record<string, string>>(initialValues);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      // Check for missing required variables
      const missingVariables = variables.filter(
        (variable) => !variableValues[variable]?.trim(),
      );

      if (missingVariables.length > 0) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Variables manquantes",
          message: `Remplissez: ${missingVariables.join(", ")}`,
        });
        setIsLoading(false);
        return;
      }

      // Fill variables via API
      const result = await fillPrompt(prompt.slug, variableValues);

      // Copy to clipboard
      await Clipboard.copy(result.filledContent);
      await showHUD(`Copied "${prompt.name}" to clipboard`);

      // Return to root
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Erreur",
        message:
          error instanceof Error ? error.message : "Failed to fill template",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVariableChange = (variable: string, value: string) => {
    setVariableValues((prev) => ({
      ...prev,
      [variable]: value,
    }));
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Fill & Copy"
            onSubmit={handleSubmit}
            icon={Icon.Clipboard}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Prompt" text={prompt.name} />
      <Form.Separator />

      {sortedVariables.map((variable) => {
        const isEmpty = aiValues[variable] === null;
        return (
          <Form.TextField
            key={variable}
            id={variable}
            title={isEmpty ? `${variable} (a completer)` : variable}
            placeholder={isEmpty ? "A completer..." : `Valeur pour ${variable}`}
            value={variableValues[variable] || ""}
            onChange={(value) => handleVariableChange(variable, value)}
          />
        );
      })}
    </Form>
  );
}
