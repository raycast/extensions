// src/add-directory.tsx
import { useState } from "react";
import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { addDirectory, Directory } from "./utils/storage";
import { v4 as uuidv4 } from "uuid";

export default function Command() {
  const { handleSubmit, itemProps, setValue } = useForm<{
    path: string[];
    name?: string;
  }>({
    async onSubmit(values) {
      setIsLoading(true);
      try {
        const selectedPath = values.path[0];
        const newDir: Directory = {
          id: uuidv4(),
          path: selectedPath,
          name: values.name || selectedPath.split("/").pop() || "Unnamed",
        };
        await addDirectory(newDir);
        showToast(Toast.Style.Success, "Directory Added", `${newDir.name} has been added to DirDock.`);
      } catch (error) {
        showToast(Toast.Style.Failure, "Failed to Add Directory", (error as Error).message);
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      path: FormValidation.Required,
    },
  });

  const [isLoading, setIsLoading] = useState(false);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Directory" onSubmit={handleSubmit} isLoading={isLoading} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        title="Directory Path"
        allowMultipleSelection={false} // 使用正确的属性名
        canChooseDirectories
        canChooseFiles={false}
        onChange={(paths: string[]) => {
          if (paths.length > 0) {
            setValue("path", paths); // path 为 string[]
          }
        }}
        {...itemProps.path}
      />
      <Form.TextField title="Name" placeholder="My Projects" {...itemProps.name} />
    </Form>
  );
}
