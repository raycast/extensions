import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import fs from "fs";
import EncodeImagePreview from "./view/EncodeImagePreview";

export default function Command() {
  const { push } = useNavigation();

  const [files, setFiles] = useState<string[]>([]);

  return (
    <Form
      actions={
        <ActionPanel title="Base64 Image">
          <Action.SubmitForm
            title="Convert"
            onSubmit={() => {
              const file = files[0];
              if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) {
                return false;
              }
              push(<EncodeImagePreview path={file} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="image"
        title="Image"
        value={files}
        onChange={(files) => {
          setFiles(files);
          push(<EncodeImagePreview path={files[0]} />);
        }}
        allowMultipleSelection={false}
      />
    </Form>
  );
}
