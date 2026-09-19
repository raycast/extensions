import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { RecipientList } from "./RecipientList";

interface Props {
  /** Why the picker is shown, so the person knows the Finder selection was not used. */
  reason?: string;
  initialFiles?: string[];
}

/** Fallback when nothing is selected in Finder: choose files or folders, then pick a recipient. */
export function FilesForm({ reason, initialFiles = [] }: Props) {
  const { push, pop } = useNavigation();
  const [files, setFiles] = useState<string[]>(initialFiles);
  const [error, setError] = useState<string>();

  function next() {
    if (files.length === 0) {
      setError("Choose at least one file or folder.");
      return;
    }
    push(<RecipientList files={files} onChangeFiles={pop} />);
  }

  return (
    <Form
      navigationTitle="Send with Blip"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Choose Recipient" icon={Icon.ArrowRight} onSubmit={next} />
        </ActionPanel>
      }
    >
      {reason && <Form.Description text={reason} />}
      <Form.FilePicker
        id="files"
        title="Files"
        value={files}
        onChange={(value) => {
          setFiles(value);
          if (value.length > 0) setError(undefined);
        }}
        allowMultipleSelection
        canChooseDirectories
        canChooseFiles
        error={error}
        info="Folders are sent as folders. Blip keeps the structure on the other side."
      />
    </Form>
  );
}
