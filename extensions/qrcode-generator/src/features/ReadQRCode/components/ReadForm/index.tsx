import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useRef } from "react";
import { readClipboardImage } from "../../services/readClipboardImage";
import type { DecodeAction } from "../../types";
import CaptureAction from "./CaptureAction";
import { runOrToast } from "./runOrToast";

interface Props {
  onDecode: DecodeAction;
}

export default function ReadForm({ onDecode }: Props) {
  const filePickerRef = useRef<Form.FilePicker>(null);

  const handleChange = async (files: string[]) => {
    if (files[0]) {
      const file = files[0];
      filePickerRef.current?.reset();
      await onDecode(file, "file");
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <CaptureAction onDecode={onDecode} />
          <Action
            title="Read from Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "v" }}
            onAction={() => runOrToast(readClipboardImage, onDecode, "clipboard")}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        ref={filePickerRef}
        id="image"
        title="Image"
        allowMultipleSelection={false}
        onChange={handleChange}
      />
      <Form.Description text="Pick a file (auto-decoded), capture a screenshot (⌘S), or read the clipboard (⌘V)." />
    </Form>
  );
}
