import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { setData } from "@/utils";
import type { ProfileFormProps, FormValues } from "./types";

export default function ProfileForm({ id, profile, revalidate }: ProfileFormProps) {
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: profile,
    async onSubmit(values) {
      await setData(id, {
        id,
        name: values.name,
        email: values.email,
      });
      await showToast({
        style: Toast.Style.Success,
        title: "Success!",
        message: `${values.name} profile saved.`,
      });
      if (revalidate) {
        await revalidate();
      }
    },
    validation: {
      name: FormValidation.Required,
      email: FormValidation.Required,
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
      <Form.TextField title="user.name" placeholder="Your name" {...itemProps.name} />
      <Form.TextField title="user.email" placeholder="test@example.com" {...itemProps.email} />
    </Form>
  );
}
