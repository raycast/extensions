import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";

import { getWorkSessionTypes, saveWorkSessionTypes } from "../lib/preferences";

type FormValues = {
  sessionTypes: string;
};

type WorkSessionTypesFormProps = {
  onSaved: (types: string[]) => Promise<void>;
};

export function WorkSessionTypesForm(props: WorkSessionTypesFormProps) {
  const { onSaved } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
    const types = values.sessionTypes
      .split("\n")
      .map((value) => value.trim())
      .filter((value, index, array) => value !== "" && array.indexOf(value) === index);

    if (types.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter at least one work session type",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await saveWorkSessionTypes(types);
      await onSaved(types);
      await showToast({
        style: Toast.Style.Success,
        title: "Work session types updated",
      });
      pop();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Work Session Types" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="How to enter types"
        text="Enter one work session type per line. Empty lines and duplicates are removed automatically."
      />
      <Form.TextArea id="sessionTypes" title="Work Session Types" defaultValue={getWorkSessionTypes().join("\n")} />
    </Form>
  );
}
