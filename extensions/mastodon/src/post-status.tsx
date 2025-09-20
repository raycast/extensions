import { Clipboard, Form } from "@raycast/api";
import { useState } from "react";

import VisibilityDropdown from "./components/VisibilityDropdown";
import SimpleCommand, { CommandProps } from "./post-simple-status";

export default function DetailCommand(props: CommandProps) {
  const [files, setFiles] = useState<string[]>([]);

  const onAddFileFromClipboard = async () => {
    const { file: clipboardFile } = await Clipboard.read();
    if (clipboardFile) {
      setFiles([...files, clipboardFile]);
    }
  };

  return (
    <SimpleCommand {...props} onAddFileFromClipboard={onAddFileFromClipboard}>
      <Form.FilePicker id="files" value={files} onChange={setFiles} title="Attachments" />
      {files.length === 1 && <Form.TextArea id="description" title="Alt text" />}
      <Form.DatePicker id="scheduled_at" title="Scheduled Time" />
      {props.launchContext?.action !== "edit" && (
        <VisibilityDropdown copiedVisiblity={props.launchContext?.status.visibility} />
      )}
    </SimpleCommand>
  );
}
