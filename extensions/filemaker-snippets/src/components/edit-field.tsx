import { useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { SnippetWithPath } from "../utils/types";
import { saveSnippetFile } from "../utils/snippets";

type Field = SnippetWithPath["dynamicFields"][number];
type FormValues = Omit<Extract<Field, { type: "dropdown" }>, "type" | "values"> & { type: string; values: string };
type EditFieldProps = { field?: Field; snippet: SnippetWithPath; onSubmit: (newSnippet: SnippetWithPath) => void };
export default function EditField(props: EditFieldProps) {
  const { field } = props;

  const { saveSnippet } = usePageLogic(props);
  const { itemProps, values, handleSubmit } = useForm<FormValues>({
    initialValues: { ...field, values: field?.type === "dropdown" ? field.values.join(",") : "" },
    validation: { name: FormValidation.Required, nameFriendly: FormValidation.Required },
    onSubmit: saveSnippet,
  });

  return (
    <Form
      navigationTitle="Edit Dynamic Field"
      actions={
        <ActionPanel>
          <Action.SubmitForm<FormValues> title="Save Snippet" onSubmit={handleSubmit} icon={Icon.Check} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.nameFriendly} title="Form Label" placeholder="For display only" />
      <Form.TextField
        {...itemProps.name}
        title="Merge Token"
        placeholder="{{variableName}}"
        info="The entire token will be replaced, so use the full syntax including {{}} (or whatever you used in your XML)"
      />
      <Form.Separator />
      <Form.TextField
        {...itemProps.default}
        title="Default Value"
        info="This value is pre-filled into the form when it loads"
      />
      <Form.Dropdown {...itemProps.type} title="Field Type">
        <Form.Dropdown.Item value="text" title="Text" />
        <Form.Dropdown.Item value="dropdown" title="Dropdown" />
      </Form.Dropdown>
      {values.type === "dropdown" && (
        <Form.TextField {...itemProps.values} title="Dropdown Options" placeholder="comma-separated values" />
      )}
    </Form>
  );
}

function usePageLogic(props: EditFieldProps) {
  const { snippet, onSubmit } = props;
  const [initialName] = useState(props.field?.name);

  async function saveSnippet(values: FormValues) {
    const toast = await showToast({ title: "Saving snippet...", style: Toast.Style.Animated });

    const field = {
      ...values,
      values: typeof values.values === "string" ? values.values?.split(",") ?? [] : values.values,
    };

    const i = snippet.dynamicFields.findIndex((f) => f.name === initialName);

    const dynamicFields = (
      i < 0
        ? [...snippet.dynamicFields, field]
        : [...snippet.dynamicFields.slice(0, i), field, ...snippet.dynamicFields.slice(i + 1)]
    ) as SnippetWithPath["dynamicFields"];

    const newSnippet = { ...snippet, dynamicFields };
    const success = await saveSnippetFile(newSnippet, snippet.path);
    if (success) {
      toast.title = "Snippet saved!";
      toast.message = "";
      toast.style = Toast.Style.Success;
      onSubmit(newSnippet);
    } else {
      toast.message = "Error saving snippet";
      toast.style = Toast.Style.Failure;
    }
  }

  return { saveSnippet };
}
