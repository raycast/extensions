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
import { fillPrompt } from "../api";
import type { PromptDetail } from "../types";
import { AiFillForm } from "./AiFillForm";

type VariableFormProps = {
  prompt: PromptDetail;
  variables: string[];
};

export function VariableForm({ prompt, variables }: VariableFormProps) {
  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

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
          title: "Missing Variables",
          message: `Please fill in: ${missingVariables.join(", ")}`,
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
        title: "Error",
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
          <Action
            title="AI Fill"
            icon={Icon.Wand}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onAction={() =>
              push(<AiFillForm prompt={prompt} variables={variables} />)
            }
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Prompt" text={prompt.name} />

      {prompt.description && (
        <Form.Description title="Description" text={prompt.description} />
      )}

      <Form.Separator />

      {variables.map((variable) => (
        <Form.TextField
          key={variable}
          id={variable}
          title={variable}
          placeholder={`Enter value for ${variable}`}
          value={variableValues[variable] || ""}
          onChange={(value) => handleVariableChange(variable, value)}
        />
      ))}

      {variables.length === 0 && (
        <Form.Description
          title="No Variables"
          text="This prompt doesn't contain any variables to fill."
        />
      )}
    </Form>
  );
}
