import { Action, ActionPanel, Form, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import fetch from "node-fetch";
import { Hue, ListIcon } from "../types";

export type CreateListFormValues = {
  name: string;
  type: string;
  description?: string;
  appearance?: {
    icon: ListIcon;
    hue: Hue | null;
  };
  visualization?: string;
};

export default function CreateListForm() {
  const { token } = getPreferenceValues<{ token: string }>();

  const { handleSubmit, itemProps, reset } = useForm<CreateListFormValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Adding list" });

      try {
        const response = await fetch("https://api.height.app/lists", {
          method: "POST",
          headers: {
            Authorization: `api-key ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(values),
        });

        if (response.ok) {
          toast.style = Toast.Style.Success;
          toast.title = "Successfully created list 🎉";

          reset({
            type: "list",
            name: "",
            description: "",
            visualization: "list",
          });
        } else {
          const json = await response.json();
          throw new Error(json.error.message);
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create list";
        toast.message = error instanceof Error ? error.message : undefined;
      }
    },
    validation: {
      name: (value) => {
        if (value && /^[^a-z0-9]/.test(value)) {
          return "Name must start with a lower letter or number";
        } else if (value && /[^a-z0-9-.]/.test(value)) {
          return "Name must contain only lower letters, numbers, dashes and periods";
        } else if (!value) {
          return "Name is required";
        }
      },
      type: FormValidation.Required,
    },
  });

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Type" {...itemProps.type}>
        <Form.Dropdown.Item value="list" title="List" icon="" />
        <Form.Dropdown.Item value="smartlist" title="Smart list" icon="" />
      </Form.Dropdown>

      <Form.TextField autoFocus title="Name" placeholder="Enter name of list" {...itemProps.name} />

      <Form.TextArea title="Description" placeholder="Describe list" {...itemProps.description} />

      <Form.Dropdown title="Visualization" {...itemProps.visualization}>
        <Form.Dropdown.Item value="list" title="List" icon="" />
        <Form.Dropdown.Item value="kanban" title="Kanban" icon="" />
      </Form.Dropdown>
    </Form>
  );
}
