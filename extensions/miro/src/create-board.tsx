import React, { useState } from "react";
import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import * as miro from "./oauth/miro";
import ListBoards from "./list-boards";

interface CreateBoardProps {
  name: string;
  description: string;
}

export default function CreateBoard() {
  const [nameError, setNameError] = useState<string | undefined>();

  const { push } = useNavigation();

  function dropNameErrorIfNeeded() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Board"
            onSubmit={async (values: CreateBoardProps) => {
              try {
                await miro.createItem(values.name, values.description);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Board created",
                });
                push(<ListBoards />);
              } catch {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Board creation failed",
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Board Name"
        placeholder="Enter your name"
        error={nameError}
        onChange={dropNameErrorIfNeeded}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("The field should't be empty!");
          } else {
            dropNameErrorIfNeeded();
          }
        }}
      />
      <Form.TextArea id="description" title="Description" placeholder="Enter board description" />
    </Form>
  );
}
