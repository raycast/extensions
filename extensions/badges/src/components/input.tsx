import { useState } from "react";
import { Action, ActionPanel, Form } from "@raycast/api";
import { getCommandConfig } from "../utils.js";

export const Input = ({
  title,
  value,
  onSubmit,
}: {
  title: string;
  value?: string;
  onSubmit: (values: Form.Values) => void;
}) => {
  const { validationFields } = getCommandConfig();
  const hasValidation = validationFields.includes(title);
  const [inputValid, setInputValid] = useState(!hasValidation || Boolean(value));

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`Submit ${title}`} onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id={title}
        title={title}
        defaultValue={value}
        placeholder={`Enter your ${title}`}
        error={inputValid ? undefined : "This field is required"}
        onChange={(newValue) => {
          if (hasValidation) {
            setInputValid(Boolean(newValue));
          }
        }}
      />
    </Form>
  );
};
