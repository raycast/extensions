import { Form, ActionPanel, Action, showHUD, showToast, Clipboard, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { createRandomAlias } from "./api/simplelogin_api";

export default function Command() {
  const [note, setNote] = useState<string | undefined>(undefined);

  const handleSubmit = async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating alias...",
    });

    try {
      const alias = await createRandomAlias(note?.trim());
      await Clipboard.copy(alias.email);
      await showHUD("Random alias created and copied to clipboard");
      popToRoot({ clearSearchBar: true });
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create alias";
      toast.message = "Houston, we've got a problem...";
    }
  };

  return (
    <Form
      navigationTitle="Create Random Alias"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Alias"
            onSubmit={handleSubmit}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Create a random SimpleLogin alias:" />
      <Form.TextArea id="note" title="Description (optional)" value={note} onChange={setNote} />
    </Form>
  );
}
