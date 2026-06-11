import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedPromise, useForm } from "@raycast/utils";
import { DASHBOARD_URL, fetchFlag, updateFlag } from "../../api";
import type { Flag } from "../../types";

interface FormValues {
  name: string;
  description: string;
  type: string;
  status: string;
  defaultValue: boolean;
  rolloutPercentage: string;
  environment: string;
}

export function EditFlag({ flag, onUpdate }: { flag: Flag; onUpdate: () => void }) {
  const { pop } = useNavigation();
  const { data: full, isLoading } = useCachedPromise(fetchFlag, [flag.id]);

  const src = full ?? flag;

  const { handleSubmit, itemProps } = useForm<FormValues>({
    initialValues: {
      name: src.name ?? "",
      description: src.description ?? "",
      type: src.type,
      status: src.status,
      defaultValue: src.defaultValue,
      rolloutPercentage: String(src.rolloutPercentage),
      environment: src.environment ?? "",
    },
    async onSubmit(values) {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Updating flag…" });
      try {
        await updateFlag(flag.id, {
          name: values.name.trim() || null,
          description: values.description.trim() || null,
          type: values.type as "boolean" | "rollout" | "multivariant",
          status: values.status as "active" | "inactive" | "archived",
          defaultValue: values.defaultValue,
          rolloutPercentage: Number(values.rolloutPercentage),
          environment: values.environment.trim() || null,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Flag updated";
        onUpdate();
        pop();
      } catch (err) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to update flag";
        toast.message = err instanceof Error ? err.message : String(err);
      }
    },
    validation: {
      rolloutPercentage(value) {
        if (!value?.trim()) return "Rollout percentage is required";
        const num = Number(value);
        if (Number.isNaN(num) || num < 0 || num > 100) return "Must be a number between 0 and 100";
      },
    },
  });

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Edit ${flag.name || flag.key}`}
      searchBarAccessory={<Form.LinkAccessory target={DASHBOARD_URL} text="Open Dashboard" />}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Editing flag "${flag.key}"`} />
      <Form.TextField
        title="Name"
        placeholder="My Feature Flag"
        info="A display name for this flag in your dashboard"
        autoFocus
        {...itemProps.name}
      />
      <Form.TextArea
        title="Description"
        placeholder="What this flag controls..."
        info="A description of what this feature flag does"
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
