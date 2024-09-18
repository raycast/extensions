import { useCallback } from "react";
import { Form, Action, ActionPanel, useNavigation, showToast, Toast } from "@raycast/api";
import fs from "fs";

export default function CreatePileForm({
  onCreate,
}: {
  onCreate: (name: string, theme: "dark" | "light", path: string) => void;
}) {
  const { pop } = useNavigation();

  const handleSubmit = useCallback(
    async (values: { name: string; theme: "dark" | "light"; path: string[] }) => {
      const folder = values.path[0];
      if (!fs.existsSync(folder)) {
        await showToast({ title: "Please pick a path", style: Toast.Style.Failure });
        return false;
      }
      onCreate(values.name, values.theme, folder);
      pop();
    },
    [onCreate, pop],
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Pile" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" />
      <Form.FilePicker
        id="path"
        title="Location"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.Dropdown id="theme" title="Theme" defaultValue="light">
        <Form.Dropdown.Item value="dark" title="Dark" />
        <Form.Dropdown.Item value="light" title="Light" />
      </Form.Dropdown>
    </Form>
  );
}
