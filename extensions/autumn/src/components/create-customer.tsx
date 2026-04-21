import { useNavigation, showToast, Toast, Form, ActionPanel, Action, Icon } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { autumn } from "../autumn";

export default function CreateCustomer({ onCreate }: { onCreate: () => void }) {
  const { pop } = useNavigation();
  type CreateCustomer = {
    name: string;
    id: string;
    email: string;
  };
  const { handleSubmit, itemProps, values } = useForm<CreateCustomer>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name || values.email || values.id);
      try {
        const { error } = await autumn.customers.create({
          name: values.name,
          id: values.id || null,
          email: values.email || null,
        });
        if (error) throw new Error(error.message);
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        onCreate();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      id(value) {
        if (!value && !values.email) return "ID or email is required";
      },
      email(value) {
        if (!value && !values.id) return "ID or email is required";
      },
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.AddPerson} title="Create Customer" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" {...itemProps.name} />
      <Form.TextField title="ID" {...itemProps.id} info="Your unique identifier for the customer" />
      <Form.TextField title="Email" {...itemProps.email} />
    </Form>
  );
}
