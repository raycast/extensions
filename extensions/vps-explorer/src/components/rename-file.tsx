import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

interface RenameFileFormValues {
  newName: string;
}

interface RenameFileProps {
  currentName: string;
  isFile: boolean;
  onSubmit: (newName: string) => void;
}

export default function RenameFile({ currentName, isFile, onSubmit }: RenameFileProps) {
  const { pop } = useNavigation();

  const getNameParts = () => {
    if (!isFile) {
      return { nameWithoutExt: currentName, extension: "" };
    }

    const lastDotIndex = currentName.lastIndexOf(".");

    if (lastDotIndex === -1 || lastDotIndex === 0) {
      return { nameWithoutExt: currentName, extension: "" };
    }

    return {
      nameWithoutExt: currentName.substring(0, lastDotIndex),
      extension: currentName.substring(lastDotIndex),
    };
  };

  const { nameWithoutExt, extension } = getNameParts();

  const { handleSubmit, itemProps } = useForm<RenameFileFormValues>({
    onSubmit(values) {
      const finalName = isFile && extension ? values.newName + extension : values.newName;
      onSubmit(finalName);
      setTimeout(() => {
        pop();
      }, 2000);
    },

    validation: {
      newName: FormValidation.Required,
    },
    initialValues: {
      newName: nameWithoutExt,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="New Name" placeholder="Enter new name" {...itemProps.newName} />
      <Form.Description
        text={
          isFile && extension
            ? `Current: ${currentName}\nExtension: ${extension} (will be preserved)`
            : `Current: ${currentName}`
        }
      />
    </Form>
  );
}
