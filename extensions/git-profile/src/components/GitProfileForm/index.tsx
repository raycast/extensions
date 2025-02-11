import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { setGitProfile } from "@/utils";
import type { GitProfile, Scope } from "@/types";

type GitProfileFormProps = {
  scope: Scope;
  profile: GitProfile;
  revalidate?: () => Promise<GitProfile[]>;
};

type FormValues = {
  name: string;
  email: string;
};

export default function GitProfileForm({ scope, profile, revalidate }: GitProfileFormProps) {
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
        message: `${profile.name} profile applied.`,
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
