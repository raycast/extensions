import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { MutatePromise, showFailureToast, useForm } from "@raycast/utils";
import { updateSpace } from "../../api";
import { Space } from "../../models";

export interface UpdateSpaceFormValues {
  name: string;
  description: string;
}

interface UpdateSpaceFormProps {
  space: Space;
  mutateSpaces: MutatePromise<Space[]>[];
}

export function UpdateSpaceForm({ space, mutateSpaces }: UpdateSpaceFormProps) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<UpdateSpaceFormValues>({
    initialValues: {
      name: space.name,
      description: space.description,
    },
    onSubmit: async (values) => {
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Updating space…",
        });

        await updateSpace(space.id, {
          name: values.name || "",
          description: values.description || "",
        });

        showToast(Toast.Style.Success, "Space updated successfully");
        mutateSpaces.forEach((mutate) => mutate());
        pop();
      } catch (error) {
        await showFailureToast(error, { title: "Failed to update space" });
      }
    },
    validation: {
      name: (v) => (!v ? "Name is required" : undefined),
    },
  });

  return (
    <Form
      navigationTitle="Edit Space"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.name} title="Name" placeholder="Enter name" info="The name of the space" />
      <Form.TextField
        {...itemProps.description}
        title="Description"
        placeholder="Enter description"
        info="The description of the space"
      />
    </Form>
  );
}
