import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast, type LaunchProps } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { createWebsite, DASHBOARD_URL, togglePublic } from "./api";
import { validateDomain } from "./lib/utils";

interface FormValues {
  name: string;
  domain: string;
  isPublic: boolean;
}

export default function Command(props: LaunchProps<{ draftValues: FormValues }>) {
  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: { isPublic: false, ...props.draftValues },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating website…" });
      try {
        const site = await createWebsite(values.name.trim(), values.domain.trim());
        if (values.isPublic) {
          await togglePublic(site.id, true);
        }
        toast.style = Toast.Style.Success;
        toast.title = "Website created";
        toast.message = values.domain;
        popToRoot();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create website";
        toast.message = err instanceof Error ? err.message : String(err);
      }
    },
    validation: {
      name: FormValidation.Required,
      domain: validateDomain,
    },
  });

  return (
    <Form
      enableDrafts
      searchBarAccessory={<Form.LinkAccessory target={DASHBOARD_URL} text="Open Dashboard" />}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Website" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Add a new website to your Databuddy account to start tracking analytics." />
      <Form.TextField
        title="Name"
        placeholder="My Website"
        info="A display name for this website in your dashboard"
        autoFocus
        {...itemProps.name}
      />
      <Form.TextField
        title="Domain"
        placeholder="example.com"
        info="The domain you want to track, without https://"
        {...itemProps.domain}
      />
      <Form.Separator />
      <Form.Checkbox
        title="Visibility"
        label="Public Dashboard"
        info="Allow anyone to view this website's analytics via a public link"
        {...itemProps.isPublic}
      />
    </Form>
  );
}
