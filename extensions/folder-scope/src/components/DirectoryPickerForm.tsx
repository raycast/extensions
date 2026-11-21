import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";

export function DirectoryPickerForm({ onPick }: { onPick: (path: string) => void }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string | undefined>();

  return (
    <Form
      navigationTitle="Choose Search Directory"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Use Directory"
            onSubmit={(values: { directory?: string[] }) => {
              const directory = values.directory?.[0];
              if (!directory) {
                setError("Pick a directory first.");
                return;
              }
              onPick(directory);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="directory"
        title="Search Directory"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        error={error}
        onChange={() => setError(undefined)}
      />
    </Form>
  );
}
