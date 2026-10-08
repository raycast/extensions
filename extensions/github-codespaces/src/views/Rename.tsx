import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { Codespace } from "../types";
import handleRename from "../methods/handleRename";
import { useState } from "react";

const Rename = ({
  codespace,
  onRevalidate,
}: {
  codespace: Codespace;
  onRevalidate: () => void;
}) => {
  const [nameError, setNameError] = useState<string | undefined>();
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename"
            onSubmit={({ name }) =>
              handleRename({ codespace, name }).finally(() => {
                pop();
                onRevalidate();
              })
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={codespace.display_name || ""}
        placeholder="Select a display name for this codespace"
        error={nameError}
        onChange={(v) => {
          if (v?.length == 0) {
            setNameError("Name is required");
          } else {
            if (nameError && nameError.length > 0) {
              setNameError(undefined);
            }
          }
        }}
      />
    </Form>
  );
};

export default Rename;
