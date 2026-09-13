import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { useEffect } from "react";
import { createContact } from "./api/endpoints";
import { ApiError } from "./lib/errors";
import { track } from "./lib/telemetry";
import { CreateExpirationForm } from "./create-expiration";

interface CreateContactValues {
  name: string;
  email: string;
  mobile: string;
  phone: string;
}

export default function CreateContactCommand() {
  const { push } = useNavigation();

  useEffect(() => track({ name: "command_opened", command_name: "create-contact" }), []);

  const { handleSubmit, itemProps, reset } = useForm<CreateContactValues>({
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating contact…" });
      try {
        const created = await createContact({
          name: values.name.trim(),
          email: values.email.trim(),
          mobile: values.mobile.trim() || undefined,
          phone: values.phone.trim() || undefined,
        });
        track({ name: "contact_created" });

        toast.style = Toast.Style.Success;
        toast.title = "Contact created";
        toast.message = created.name;
        toast.primaryAction = {
          title: "Create an Expiration for This Contact",
          shortcut: { modifiers: ["cmd"], key: "e" },
          onAction: () =>
            push(<CreateExpirationForm defaultContactId={created.id} defaultContactName={created.name} />),
        };
        reset({ name: "", email: "", mobile: "", phone: "" });
      } catch (error) {
        if (error instanceof ApiError) {
          track({
            name: "error_occurred",
            command_name: "create-contact",
            http_status: error.status,
            code: error.code,
          });
        }
        await showFailureToast(error, { title: "Couldn't create contact" });
      }
    },
    initialValues: { name: "", email: "", mobile: "", phone: "" },
    validation: {
      name: FormValidation.Required,
      email: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Contact" icon={Icon.AddPerson} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.name} title="Name" placeholder="Full name" />
      <Form.TextField {...itemProps.email} title="Email" placeholder="name@example.com" />
      <Form.TextField {...itemProps.mobile} title="Mobile" placeholder="Optional" />
      <Form.TextField {...itemProps.phone} title="Phone" placeholder="Optional" />
    </Form>
  );
}
