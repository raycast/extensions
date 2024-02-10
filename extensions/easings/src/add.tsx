import { useState } from "react";

import { Action, ActionPanel, Form, showHUD } from "@raycast/api";

import { Item, saveItems } from "./utils/storage";

export default function Command() {
  const [nameError, setNameError] = useState<string | undefined>();
  const [easingError, setEasingError] = useState<string | undefined>();

  function renderNameError() {
    if (nameError && nameError.length > 0) {
      setNameError(undefined);
    }
  }

  function renderEasingError() {
    if (easingError && easingError.length > 0) {
      setEasingError(undefined);
    }
  }

  async function handleSubmit(values: Item[]) {
    await saveItems(values);

    showHUD("Successfully saved ✅");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Easing" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        key="name"
        title="Name"
        placeholder="Enter a name for your easing"
        error={nameError}
        onChange={renderNameError}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("The field should't be empty!");
          } else {
            renderNameError();
          }
        }}
      />
      <Form.TextField
        id="easing"
        key="easing"
        title="New Easing"
        placeholder="1, 0, 0, 1"
        error={easingError}
        onChange={renderEasingError}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setNameError("The field should't be empty!");
          } else {
            renderEasingError();
          }
        }}
      />
    </Form>
  );
}
