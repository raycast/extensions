// src/edit-directory.tsx
import { Action, ActionPanel, Form, List, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { updateDirectory, getTags, Tag } from "./utils/storage";

interface Directory {
  id: string;
  path: string;
  name: string;
  tags: string[];
}
import { useEffect, useState } from "react";

interface EditDirectoryProps {
  directory: Directory;
  onEdit: () => void;
}

export default function EditDirectoryCommand({ directory, onEdit }: EditDirectoryProps) {
  const { handleSubmit, itemProps, setValue } = useForm<{
    path: string[];
    name?: string;
    tags: string[];
  }>({
    async onSubmit(values) {
      setIsLoading(true);
      try {
        const updatedDir: Directory = {
          id: directory.id,
          path: values.path[0],
          name: values.name || values.path[0].split("/").pop() || "Unnamed",
          tags: values.tags,
        };
        await updateDirectory(updatedDir);
        showToast(Toast.Style.Success, "Directory Updated", `${updatedDir.name} has been updated.`);
        onEdit();
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to Update Directory", (error as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      path: [directory.path],
      name: directory.name,
      tags: directory.tags,
    },
    validation: {
      path: FormValidation.Required,
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  const fetchTags = async () => {
    const tags = await getTags();
    setAvailableTags(tags);
  };

  useEffect(() => {
    fetchTags();
  }, []);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Directory" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        title="Directory Path"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        onChange={(paths: string[]) => {
          if (paths.length > 0) {
            setValue("path", paths);
          }
        }}
        {...itemProps.path}
      />
      <Form.TextField title="Name" placeholder="My Projects" {...itemProps.name} />
      <Form.TagPicker title="Tags" {...itemProps.tags}>
        {availableTags.map((tag) => (
          <List.Item.Detail.Metadata.TagList.Item key={tag.id} text={tag.name} color={tag.color} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
