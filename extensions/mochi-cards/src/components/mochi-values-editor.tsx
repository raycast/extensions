import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";

import {
  editMochiValues,
  getMochiFieldValues,
  type GeneratedSession,
  type ManuallyEditedSession,
} from "../domain/generation-session";
import type { FieldValues } from "../domain/template";

export function MochiValuesEditor({
  session,
  onSave,
}: {
  readonly session: GeneratedSession;
  readonly onSave: (session: ManuallyEditedSession) => void;
}) {
  const { pop } = useNavigation();
  const output = session.output;
  const [values, setValues] = useState<FieldValues>(() => getMochiFieldValues(session));
  if (output.kind !== "mochi-template") {
    throw new Error("Mochi values editor requires Mochi output");
  }
  return (
    <Form
      navigationTitle="Edit Mochi Fields"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Field Values"
            icon={Icon.SaveDocument}
            onSubmit={() => {
              onSave(editMochiValues(session, values));
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      {output.fields.map(({ target }) =>
        target.type.trim().toLowerCase() === "boolean" ? (
          <Form.Checkbox
            key={target.id}
            id={target.id}
            title={target.name}
            label="Enabled"
            value={values[target.id] === true}
            onChange={(value) => setValues((current) => ({ ...current, [target.id]: value }))}
          />
        ) : target.type.trim().toLowerCase() === "text" && target.multiline ? (
          <Form.TextArea
            key={target.id}
            id={target.id}
            title={target.name}
            value={String(values[target.id] ?? "")}
            onChange={(value) => setValues((current) => ({ ...current, [target.id]: value }))}
          />
        ) : (
          <Form.TextField
            key={target.id}
            id={target.id}
            title={target.name}
            value={String(values[target.id] ?? "")}
            onChange={(value) => setValues((current) => ({ ...current, [target.id]: value }))}
          />
        )
      )}
      {output.fields.length === 0 ? (
        <Form.Description title="Fields" text="This template has no mapped fields." />
      ) : null}
    </Form>
  );
}
