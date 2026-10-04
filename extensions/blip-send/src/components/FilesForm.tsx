import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { isWindows } from "../platform";
import { RecipientList } from "./RecipientList";

type Kind = "files" | "folders";

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
  // A Windows file picker chooses files or folders, never both, so it needs a switch.
  const [kind, setKind] = useState<Kind>("files");
  const picker = isWindows
    ? { canChooseFiles: kind === "files", canChooseDirectories: kind === "folders" }
    : { canChooseFiles: true, canChooseDirectories: true };

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
      {isWindows && (
        <Form.Dropdown
          id="kind"
          title="Send"
          value={kind}
          onChange={(value) => {
            setKind(value as Kind);
            setFiles([]);
          }}
        >
          <Form.Dropdown.Item value="files" title="Files" icon={Icon.Document} />
          <Form.Dropdown.Item value="folders" title="Folders" icon={Icon.Folder} />
        </Form.Dropdown>
      )}
      <Form.FilePicker
        id="files"
        title={picker.canChooseFiles ? "Files" : "Folders"}
        value={files}
        onChange={(value) => {
          setFiles(value);
          if (value.length > 0) setError(undefined);
        }}
        allowMultipleSelection
        {...picker}
        error={error}
        info="Folders are sent as folders. Blip keeps the structure on the other side."
      />
    </Form>
  );
}
