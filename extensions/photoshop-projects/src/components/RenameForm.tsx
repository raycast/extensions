import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { PhotoshopFile } from "../types";
import { renamePhotoshopFile } from "../utils/fileAttributes";

interface RenameFormProps {
  file: PhotoshopFile;
  onRenamed?: (newPath: string) => void;
}

export function RenameForm({ file, onRenamed }: RenameFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState<string>(file.title);
  const [nameError, setNameError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setNameError("Filename cannot be empty");
      return;
    }
    if (trimmed.includes("/") || trimmed.includes(":")) {
      setNameError("Filename cannot contain slashes or colons");
      return;
    }

    setIsSubmitting(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Renaming document...",
    });

    try {
      const newPath = await renamePhotoshopFile(file.path, trimmed);
      const renamedFilename = newPath.split(/[\\/]/).pop() ?? newPath;
      toast.style = Toast.Style.Success;
      toast.title = "Document renamed";
      toast.message = renamedFilename;
      if (onRenamed) onRenamed(newPath);
      pop();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Rename failed";
      toast.message = String(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Document" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Location" text={file.directory} />
      <Form.TextField
        id="name"
        title="New Name"
        value={name}
        error={nameError}
        onChange={(val) => {
          setName(val);
          if (nameError) setNameError(undefined);
        }}
      />
      <Form.Description title="Extension" text={`.${file.extension}`} />
    </Form>
  );
}
