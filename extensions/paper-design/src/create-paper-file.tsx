import {
  Action,
  ActionPanel,
  Form,
  Icon,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { useForm } from "@raycast/utils";

import {
  createPaperFile,
  getPaperErrorMessage,
  getPaperFileUrl,
} from "./paper-mcp";

type CreatePaperFileFormValues = {
  name: string;
};

export default function CreatePaperFileCommand() {
  const { handleSubmit, itemProps } = useForm<CreatePaperFileFormValues>({
    async onSubmit({ name }) {
      const fileName = name.trim();

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating Paper file",
      });

      let fileId: string;
      try {
        fileId = await createPaperFile(fileName);
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could not create Paper file";
        toast.message = getPaperErrorMessage(error);
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
    },
    validation: {
      name: (value) => {
        if (!value?.trim()) {
          return "Enter a file name.";
        }
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create and Open"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        placeholder="Landing page"
        info="Creates the file in your active Paper team."
        autoFocus
        {...itemProps.name}
      />
    </Form>
  );
}
