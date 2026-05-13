import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useState } from "react";
import { readClipboardImage } from "../../services/readClipboardImage";
import type { DecodeAction } from "../../types";
import CaptureAction from "./CaptureAction";
import { runOrToast } from "./runOrToast";

interface Props {
  onDecode: DecodeAction;
}

export default function ReadForm({ onDecode }: Props) {
  const [pickerKey, setPickerKey] = useState(0);

  const handleChange = async (files: string[]) => {
    if (files[0]) {
      await onDecode(files[0], "file");
      setPickerKey((k) => k + 1);
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
        key={pickerKey}
        id="image"
        title="Image"
        allowMultipleSelection={false}
        onChange={handleChange}
      />
      <Form.Description text="Pick a file (auto-decoded), capture a screenshot (⌘S), or read the clipboard (⌘V)." />
    </Form>
  );
}
