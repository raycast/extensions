import {
  Action,
  ActionPanel,
  Form,
  Icon,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";

import { createPaperFile, getPaperFileUrl } from "./paper-mcp";

type CreatePaperFileFormValues = {
  name: string;
};

export default function CreatePaperFileCommand() {
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();

  async function createAndOpenFile({ name }: CreatePaperFileFormValues) {
    const fileName = name.trim();

    if (!fileName) {
      setNameError("Enter a file name.");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating Paper file",
    });

    let fileId: string;
    try {
      fileId = await createPaperFile(fileName);
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not create Paper file";
      toast.message =
        "Open Paper Desktop with any Paper file loaded, then try again.";
      return;
    }

    try {
      await open(getPaperFileUrl(fileId));
      toast.style = Toast.Style.Success;
      toast.title = `Created “${fileName}” in Paper`;
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = "Paper file created but could not be opened";
      toast.message = "Open it from Paper Desktop.";
    }
  }

  return (
    <Form
      navigationTitle="Create File"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create and Open"
            icon={Icon.Plus}
            onSubmit={createAndOpenFile}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        info="Creates the file in your active Paper team."
        autoFocus
        value={name}
        error={nameError}
        onChange={(value) => {
          setName(value);
          if (value.trim()) {
            setNameError(undefined);
          }
        }}
      />
    </Form>
  );
}
