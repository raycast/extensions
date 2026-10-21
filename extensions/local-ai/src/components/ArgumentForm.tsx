import { Action, ActionPanel, Form } from "@raycast/api";
import { useState } from "react";
import type { AiCommand } from "../lib/commands/types";
import type { ArgumentSpec } from "../lib/placeholders";

export function ArgumentForm(props: {
  command: AiCommand;
  specs: ArgumentSpec[];
  onSubmit: (values: Record<string, string>) => void;
}) {
  const { command, specs, onSubmit } = props;
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  function submit(values: Record<string, string>) {
    const resolved: Record<string, string> = {};
    const missing: Record<string, string> = {};
    for (const spec of specs) {
      const value = (values[spec.name] ?? "").trim() || spec.defaultValue || "";
      if (value) resolved[spec.name] = value;
      else missing[spec.name] = "Required";
    }
    setErrors(missing);
    if (Object.keys(missing).length === 0) onSubmit(resolved);
  }

  return (
    <Form
      navigationTitle={command.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Command" onSubmit={submit} />
        </ActionPanel>
      }
    >
      {specs.map((spec, index) =>
        spec.options ? (
          <Form.Dropdown
            key={spec.name}
            id={spec.name}
            title={spec.name}
            defaultValue={spec.defaultValue}
            autoFocus={index === 0}
          >
            {spec.options.map((option) => (
              <Form.Dropdown.Item key={option} value={option} title={option} />
            ))}
          </Form.Dropdown>
        ) : (
          <Form.TextField
            key={spec.name}
            id={spec.name}
            title={spec.name}
            defaultValue={spec.defaultValue}
            error={errors[spec.name]}
            onChange={() => errors[spec.name] && setErrors({ ...errors, [spec.name]: undefined })}
            autoFocus={index === 0}
          />
        ),
      )}
    </Form>
  );
}
