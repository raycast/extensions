import { Action, ActionPanel, Form, getPreferenceValues, popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { validateSnippet } from "../../lib/snippetUtils";
import type { Preferences } from "../../types";

interface AliasFormValues {
  alias: string;
  value: string;
  label?: string;
  snippetOnly: boolean;
}

interface AliasFormProps {
  initialValues?: Partial<AliasFormValues>;
  onSubmit: (values: AliasFormValues) => Promise<void>;
  submitTitle: string;
  mode: "create" | "edit";
}

export function AliasForm({ initialValues, onSubmit, submitTitle, mode }: AliasFormProps) {
  const preferences = getPreferenceValues<Preferences>();
  const separator = preferences.randomizedSnippetSeparator || ";;";

  const { handleSubmit, itemProps, values } = useForm<AliasFormValues>({
    initialValues: {
      alias: initialValues?.alias ?? "",
      value: initialValues?.value ?? "",
      label: initialValues?.label ?? "",
      snippetOnly: initialValues?.snippetOnly ?? false,
    },
    onSubmit: async (values) => {
      try {
        await onSubmit(values);
        const itemType = values.snippetOnly ? "Snippet" : "Alias";
        await showToast(
          Toast.Style.Success,
          mode === "create" ? `${itemType} created` : `${itemType} updated`,
          values.alias,
        );
        popToRoot();
      } catch (error) {
        await showFailureToast(error, {
          title:
            mode === "create"
              ? `Failed to create ${values.snippetOnly ? "snippet" : "alias"}`
              : `Failed to update ${values.snippetOnly ? "snippet" : "alias"}`,
        });
      }
    },
    validation: {
      alias: (value) => {
        if (!value?.trim()) return "Alias is required";
      },
      value: (value) => {
        if (!value?.trim()) return "Value is required";
        if (values?.snippetOnly) {
          const validation = validateSnippet(value, separator);
          if (!validation.isValid) return validation.error;
        }
      },
    },
  });

  const isSnippetMode = values.snippetOnly;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          mode === "create"
            ? "Create a new Better Alias for URLs, apps, commands, or text snippets."
            : "Edit the alias or snippet details below."
        }
      />
      <Form.TextField
        title="Alias"
        placeholder={isSnippetMode ? "Enter snippet alias (e.g., ',hey')" : "Enter alias name (e.g., 'gh')"}
        info="The shorthand you'll type to trigger this alias or snippet"
        {...itemProps.alias}
      />
      <Form.TextArea
        title={isSnippetMode ? "Body" : "Value"}
        placeholder={
          isSnippetMode ? `Hello!${separator}Hey!${separator}Hi there!` : "Enter URL, file path, or text content"
        }
        info={
          isSnippetMode
            ? "Text to insert. Use separator for random variations"
            : "What should happen when this alias is triggered"
        }
        {...itemProps.value}
      />
      <Form.TextField
        title="Label (optional)"
        placeholder="Enter display name"
        info="Optional friendly name shown in search results"
        {...itemProps.label}
      />
      <Form.Checkbox
        title="Snippet Mode"
        label="Snippet Only (text insertion mode)"
        info="When enabled, this will only insert text and won't open URLs or apps"
        {...itemProps.snippetOnly}
      />
    </Form>
  );
}
