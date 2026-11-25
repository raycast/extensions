import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useState } from "react";
import { safeRenameProject } from "../services/file-operations";
import { PremiereFile } from "../types";

interface RenameFormProps {
  file: PremiereFile;
  onRenamed?: (newPath: string) => void;
}

export function RenameForm({ file, onRenamed }: RenameFormProps) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(file.title);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = async () => {
    const clean = title.trim();
    if (!clean) {
      setError("Project name cannot be empty");
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Renaming project...",
    });

    try {
      const newPath = await safeRenameProject(file.path, clean);
      toast.style = Toast.Style.Success;
      toast.title = "Project renamed successfully";
      if (onRenamed) {
        onRenamed(newPath);
      }
      pop();
    } catch (err: unknown) {
      await showFailureToast(err, { title: "Failed to rename project" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Current Project" text={`${file.name} (${file.formattedSize})`} />
      <Form.TextField
        id="title"
        title="New Name"
        value={title}
        error={error}
        onChange={(val) => {
          setTitle(val);
          if (error) setError(undefined);
        }}
        placeholder="Enter new project name"
      />
      <Form.Description text={`Extension (.${file.extension}) will be preserved automatically.`} />
    </Form>
  );
}
