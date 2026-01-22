import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { createTicket } from "./utils/freshservice";
import { isAxiosError } from "axios";
import { PriorityOptions, StatusOptions } from "./utils/types";

interface CreateTicketFormValues {
  subject: string;
  description: string;
  email: string;
  priority: string;
  status: string;
}

export default function Command() {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<CreateTicketFormValues>({
    onSubmit: async (values) => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Creating ticket...",
      });

      try {
        await createTicket({
          subject: values.subject,
          description: values.description,
          email: values.email,
          priority: parseInt(values.priority),
          status: parseInt(values.status),
        });

        toast.style = Toast.Style.Success;
        toast.title = "Ticket created";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create ticket";
        if (isAxiosError(error)) {
          toast.message = error.response?.data?.message || error.message;
        } else if (error instanceof Error) {
          toast.message = error.message;
        }
      }
    },
    validation: {
      subject: FormValidation.Required,
      description: FormValidation.Required,
      email: (value) => {
        if (!value) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
          return "Invalid email format";
      },
    },
    initialValues: {
      priority: "1", // Low
      status: "2", // Open
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Subject"
        placeholder="Brief summary of the issue"
        {...itemProps.subject}
      />
      <Form.TextArea
        title="Description"
        placeholder="Detailed description"
        {...itemProps.description}
      />
      <Form.TextField
        title="Requester Email"
        placeholder="user@example.com"
        {...itemProps.email}
      />

      <Form.Dropdown title="Priority" {...itemProps.priority}>
        {PriorityOptions.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value.toString()}
            title={option.title}
          />
        ))}
      </Form.Dropdown>

      <Form.Dropdown title="Status" {...itemProps.status}>
        {StatusOptions.map((option) => (
          <Form.Dropdown.Item
            key={option.value}
            value={option.value.toString()}
            title={option.title}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
