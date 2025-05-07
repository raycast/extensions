import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { createSpace } from "../../api";

export interface CreateSpaceFormValues {
  name?: string;
  description?: string;
}
interface CreateSpaceFormProps {
  draftValues: CreateSpaceFormValues;
}

export function CreateSpaceForm({ draftValues }: CreateSpaceFormProps) {
  const { handleSubmit, itemProps } = useForm<CreateSpaceFormValues>({
    initialValues: draftValues,
    onSubmit: async (values) => {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Creating space..." });

        await createSpace({
          name: values.name || "",
          description: values.description || "",
        });

        showToast(Toast.Style.Success, "Space created successfully");
        popToRoot();
      } catch (error) {
        await showFailureToast(error, { title: "Failed to create space" });
      }
    },
    validation: {
      name: (value) => {
        if (!value) {
          return "Name is required";
        }
      },
    },
  });

  return (
    <Form
      navigationTitle="Create Space"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Space" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.name} title="Name" placeholder="Enter space name" info="The name of the space" />
      <Form.TextField
        {...itemProps.description}
        title="Description"
        placeholder="Enter space description"
        info="The description of the space"
      />
    </Form>
  );
}
