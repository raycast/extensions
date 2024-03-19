import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import AddActionsForm from "./add-actions";
import { Workspace } from "./data/workspace";
import { randomUUID } from "crypto";
import { saveWorkspace } from "./data/util/storage";
import { useState } from "react";

type Values = {
  name: string;
  textarea: string;
  datepicker: Date;
  checkbox: boolean;
  dropdown: string;
  tokeneditor: string[];
};

export default function Command() {
  const [nameError, setNameError] = useState<string | undefined>();

  const navigation = useNavigation();
  async function handleSubmit(values: Values) {
    if (values.name.trim().length == 0) {
      setNameError("Name shouldn't be empty.");
      return;
    }
    const workspace: Workspace = {
      id: randomUUID().toString(),
      name: values.name,
    };
    await saveWorkspace(workspace);
    navigation.push(<AddActionsForm workspace={workspace} />);
  }

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} title="Save Workspace" />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter Your Workspace Details" />
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My Workspace"
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("Name shouldn't be empty.");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />
    </Form>
  );
}
