import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { Codespace } from "../types";
import handleRename from "../methods/handleRename";

const Rename = ({
  codespace,
  onRevalidate,
}: {
  codespace: Codespace;
  onRevalidate: () => void;
}) => {
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
      />
    </Form>
  );
};

export default Rename;
