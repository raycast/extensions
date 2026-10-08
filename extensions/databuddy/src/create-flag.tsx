import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast, type LaunchProps } from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { createFlag, DASHBOARD_URL, fetchWebsites } from "./api";
import type { Website } from "./types";

interface FormValues {
  websiteId: string;
  key: string;
  name: string;
  description: string;
  type: string;
  status: string;
  defaultValue: boolean;
  rolloutPercentage: string;
  environment: string;
}

export default function Command(props: LaunchProps<{ draftValues: FormValues }>) {
  const { data: websites, isLoading: loadingWebsites } = useCachedPromise(fetchWebsites);

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      websiteId: "",
      type: "boolean",
      status: "inactive",
      defaultValue: false,
      rolloutPercentage: "100",
      ...props.draftValues,
    },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Creating flag…" });
      try {
        const siteId = values.websiteId || websites?.[0]?.id;
        if (!siteId) throw new Error("No website selected.");
        const flag = await createFlag(siteId, {
          key: values.key.trim(),
          ...(values.name?.trim() ? { name: values.name.trim() } : {}),
          ...(values.description?.trim() ? { description: values.description.trim() } : {}),
          type: values.type as "boolean" | "rollout" | "multivariant",
          status: values.status as "active" | "inactive" | "archived",
          defaultValue: values.defaultValue,
          rolloutPercentage: Number(values.rolloutPercentage),
          ...(values.environment?.trim() ? { environment: values.environment.trim() } : {}),
        });
        toast.style = Toast.Style.Success;
        toast.title = "Flag created";
        toast.message = flag.key;
        popToRoot();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to create flag";
        toast.message = err instanceof Error ? err.message : String(err);
      }
    },
    validation: {
      key(value) {
        if (!value?.trim()) return "Key is required";
        if (!/^[a-z0-9_-]+$/.test(value.trim())) return "Only lowercase letters, numbers, hyphens, underscores";
      },
      rolloutPercentage(value) {
        if (!value?.trim()) return "Rollout percentage is required";
        const num = Number(value);
        if (Number.isNaN(num) || num < 0 || num > 100) return "Must be a number between 0 and 100";
      },
    },
  });

  return (
    <Form
      isLoading={loadingWebsites}
      enableDrafts
      searchBarAccessory={<Form.LinkAccessory target={DASHBOARD_URL} text="Open Dashboard" />}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Flag" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Website" info="The website this flag belongs to" {...itemProps.websiteId}>
        {websites?.map((site: Website) => (
          <Form.Dropdown.Item key={site.id} title={`${site.name} (${site.domain})`} value={site.id} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description text="Create a new feature flag to control rollouts with Databuddy." />
      <Form.TextField
        title="Key"
        placeholder="my_feature_flag"
        info="A unique identifier for this flag — lowercase, numbers, hyphens, underscores only"
        autoFocus
        {...itemProps.key}
      />
      <Form.TextField
        title="Name"
        placeholder="My Feature Flag"
        info="Optional display name for this flag in your dashboard"
        {...itemProps.name}
      />
      <Form.TextArea
        title="Description"
        placeholder="What this flag controls..."
        info="Optional description of what this feature flag does"
        {...itemProps.description}
      />

      <Form.Separator />

      <Form.Dropdown
        title="Type"
        info="Boolean flags are on/off, multivariate flags can have multiple values"
        {...itemProps.type}
      >
        <Form.Dropdown.Item title="Boolean" value="boolean" />
        <Form.Dropdown.Item title="Rollout" value="rollout" />
        <Form.Dropdown.Item title="Multivariant" value="multivariant" />
      </Form.Dropdown>
      <Form.Dropdown
        title="Status"
        info="Active flags are evaluated, inactive flags always return the default value"
        {...itemProps.status}
      >
        <Form.Dropdown.Item title="Active" value="active" />
        <Form.Dropdown.Item title="Inactive" value="inactive" />
        <Form.Dropdown.Item title="Archived" value="archived" />
      </Form.Dropdown>
      <Form.Checkbox
        title="Default Value"
        label="Enabled"
        info="The value returned when the flag is not matched by any rules"
        {...itemProps.defaultValue}
      />
      <Form.TextField
        title="Rollout %"
        placeholder="100"
        info="Percentage of users who will see this flag enabled (0–100)"
        {...itemProps.rolloutPercentage}
      />

      <Form.Separator />

      <Form.TextField
        title="Environment"
        placeholder="production"
        info="Optional — restrict this flag to a specific environment"
        {...itemProps.environment}
      />
    </Form>
  );
}
