import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { basename } from "path";
import { createTryDirectory, generateDatePrefix } from "../lib/utils";

interface CreateFormProps {
  onSuccess: () => void;
}

export function CreateForm({ onSuccess }: CreateFormProps) {
  const [name, setName] = useState("");
  const { pop } = useNavigation();

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Name required",
      });
      return;
    }

    try {
      const createdPath = createTryDirectory(name);
      const dirName = basename(createdPath);
      showToast({
        style: Toast.Style.Success,
        title: "Created",
        message: dirName,
      });
      onSuccess();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to create directory",
        message: String(error),
      });
    }
  };

  return (
    <Form
      navigationTitle="Create Try Directory"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="my-experiment"
        info={`Will create: ${generateDatePrefix()}-${name || "..."} (auto-numbered if exists)`}
        value={name}
        onChange={setName}
        autoFocus
      />
    </Form>
  );
}
