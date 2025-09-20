import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { setGitProfile } from "@/utils";
import type { GitProfileFormProps, FormValues } from "./types";

export default function GitProfileForm({ scope, profile, revalidate }: GitProfileFormProps) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      name: profile.name || "",
      email: profile.email || "",
    },
    async onSubmit(values) {
      await setGitProfile(scope, values);
      await showToast({
        style: Toast.Style.Success,
        title: "Success!",
        message: `${values.name} profile applied.`,
      });

      if (revalidate) {
        await revalidate();
      }

      pop();
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
      <Form.TextField title="Full Name" placeholder="Your name" {...itemProps.name} />
      <Form.TextField title="Email address" placeholder="test@example.com" {...itemProps.email} />
    </Form>
  );
}
