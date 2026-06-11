import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { DASHBOARD_URL, fetchWebsite, togglePublic, updateWebsite } from "../../api";
import type { Website } from "../../types";
import { validateDomain } from "../../lib/utils";

interface FormValues {
  name: string;
  domain: string;
  isPublic: boolean;
}

export function EditWebsite({ site, onUpdate }: { site: Website; onUpdate: () => void }) {
  const { pop } = useNavigation();
  const { data: full, isLoading } = useCachedPromise(fetchWebsite, [site.id]);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      name: full?.name ?? site.name,
      domain: full?.domain ?? site.domain,
      isPublic: full?.isPublic ?? false,
    },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Updating website…" });
      try {
        const domainChanged = values.domain.trim() !== site.domain ? values.domain.trim() : undefined;
        await updateWebsite(site.id, values.name.trim(), domainChanged);

        const publicChanged = values.isPublic !== (full?.isPublic ?? false);
        if (publicChanged) {
          await togglePublic(site.id, values.isPublic);
        }

        toast.style = Toast.Style.Success;
        toast.title = "Website updated";
        onUpdate();
        pop();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to update website";
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
      isLoading={isLoading}
      navigationTitle={`Edit ${site.name}`}
      searchBarAccessory={<Form.LinkAccessory target={DASHBOARD_URL} text="Open Dashboard" />}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Editing ${site.domain}`} />
      <Form.TextField title="Name" placeholder="My Website" autoFocus {...itemProps.name} />
      <Form.TextField
        title="Domain"
        placeholder="example.com"
        info="Changing the domain will update your tracking snippet"
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
