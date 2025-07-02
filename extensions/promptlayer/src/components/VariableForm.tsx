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
} from "@raycast/api";
import { PromptTemplate } from "../types";
import { renderTemplate } from "../utils";

interface VariableFormProps {
  template: PromptTemplate;
  variables: string[];
}

export function VariableForm({ template, variables }: VariableFormProps) {
  const [variableValues, setVariableValues] = useState<Record<string, string>>(
    {},
  );
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
          title: "Missing Variables",
          message: `Please fill in: ${missingVariables.join(", ")}`,
        });
        setIsLoading(false);
        return;
      }

      // Render the template with variables
      const filledContent = renderTemplate(template.template, variableValues);

      // Copy to clipboard
      await Clipboard.copy(filledContent);

      await showToast({
        style: Toast.Style.Success,
        title: "Copied to Clipboard",
        message: `"${template.name}" filled and copied`,
      });

      // Return to root
      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message:
          error instanceof Error ? error.message : "Failed to process template",
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
            title="Fill Template & Copy"
            onSubmit={handleSubmit}
            icon={Icon.Clipboard}
          />
          <Action
            title="Preview Template"
            onAction={() => {
              try {
                const preview = renderTemplate(
                  template.template,
                  variableValues,
                );
                showToast({
                  style: Toast.Style.Success,
                  title: "Template Preview",
                  message:
                    preview.substring(0, 100) +
                    (preview.length > 100 ? "..." : ""),
                });
              } catch (error) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Preview Error",
                  message:
                    error instanceof Error
                      ? error.message
                      : "Failed to preview",
                });
              }
            }}
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Template" text={template.name} />

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
          text="This template doesn't contain any variables to fill."
        />
      )}
    </Form>
  );
}
