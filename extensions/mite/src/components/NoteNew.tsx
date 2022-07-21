import { Action, ActionPanel, Form, LocalStorage } from "@raycast/api";
import React, { useState } from "react";
import { createMiteEntry } from "../utils/utils";
import Values = LocalStorage.Values;

interface IProps {
  projectId: number;
  projectName: string;
  serviceId: number;
  serviceName: string;
}

export default function NoteNew({ projectId, projectName, serviceId, serviceName }: IProps) {
  const [note, setNote] = useState<string>();

  function handleSubmit(values: Values) {
    createMiteEntry(projectId, serviceId, values.note);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Mite Entry & Start Timer" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Project" text={projectName} />
      <Form.Description title="Service" text={serviceName} />
      <Form.TextField id="note" value={note} onChange={setNote} title="Note" />
    </Form>
  );
}
