import { Action, ActionPanel, Form, LaunchProps, showToast, Toast } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { ApiList } from "./api/list";
import { CreateListFormValues } from "./types/list";

export default function Command(props: LaunchProps<{ draftValues: CreateListFormValues }>) {
  const { draftValues } = props;

  const { handleSubmit, itemProps, reset } = useForm<CreateListFormValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Adding list" });

      console.log("values:", values);

      try {
        const [data, error] = await ApiList.create(values);

        if (data) {
          toast.style = Toast.Style.Success;
          toast.title = "Successfully created list 🎉";

          reset({
            type: "list",
            name: "",
            description: "",
            visualization: "list",
          });
        }
        if (error) {
          throw new Error(error.message);
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create list";
        toast.message = error instanceof Error ? error.message : undefined;
      }
    },
    initialValues: {
      type: draftValues?.type,
      visualization: draftValues?.visualization,
      name: draftValues?.name,
      description: draftValues?.description,
    },
    validation: {
      type: FormValidation.Required,
      name: (value) => {
        if (value && /^[^a-ząćęłńóśźż0-9]/.test(value)) {
          return "Name must start with a lower letter or number";
        } else if (value && /[^a-ząćęłńóśźż0-9-.]/.test(value)) {
          return "Name must contain only lower letters, numbers, dashes and periods";
        } else if (!value) {
          return "Name is required";
        }
      },
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

      <Form.Dropdown title="Visualization" {...itemProps.visualization}>
        <Form.Dropdown.Item value="list" title="Spreadsheet" icon="" />
        <Form.Dropdown.Item value="kanban" title="Kanban" icon="" />
        <Form.Dropdown.Item value="calendar" title="Calendar" icon="" />
        <Form.Dropdown.Item value="gantt" title="Gantt" icon="" />
      </Form.Dropdown>

      <Form.TextField autoFocus title="Name" placeholder="Enter name of list" {...itemProps.name} />

      <Form.TextArea title="Description" placeholder="Describe list" {...itemProps.description} />

      <Form.TextField autoFocus title="Hue" placeholder="Enter number from 0 to 360" {...itemProps.name} />

      <Form.TextField autoFocus title="Name" placeholder="Enter name of list" {...itemProps.name} />
    </Form>
  );
}
