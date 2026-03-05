import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Environment } from "./types";
import { getEnvironments, addDeployment } from "./storage";
import { generateId } from "./utils";

interface Props {
  preselectedEnvId?: string;
  onAdded?: () => void;
}

export default function AddDeployment({ preselectedEnvId, onAdded }: Props) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { pop } = useNavigation();

  useEffect(() => {
    getEnvironments().then((envs) => {
      setEnvironments(envs);
      setIsLoading(false);
    });
  }, []);

  async function handleSubmit(values: {
    environmentId: string;
    ref: string;
    notes: string;
    deployedBy: string;
    deployedAt: Date | null;
  }) {
    if (!values.ref.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Commit / version is required",
      });
      return;
    }
    if (!values.environmentId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select an environment",
      });
      return;
    }

    await addDeployment({
      id: generateId(),
      environmentId: values.environmentId,
      ref: values.ref.trim(),
      deployedAt: (values.deployedAt ?? new Date()).toISOString(),
      notes: values.notes.trim() || undefined,
      deployedBy: values.deployedBy.trim() || undefined,
    });

    const env = environments.find((e) => e.id === values.environmentId);
    await showToast({
      style: Toast.Style.Success,
      title: "Deployment logged",
      message: `${values.ref.trim()} → ${env?.name ?? values.environmentId}`,
    });

    onAdded?.();
    pop();
  }

  if (!isLoading && environments.length === 0) {
    return (
      <Form>
        <Form.Description
          title="No environments configured"
          text="Open 'Manage Environments' to add environments before logging deployments."
        />
      </Form>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Add Deployment"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Plus}
            title="Log Deployment"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="environmentId"
        title="Environment"
        defaultValue={preselectedEnvId}
      >
        {environments.map((env) => (
          <Form.Dropdown.Item key={env.id} value={env.id} title={env.name} />
        ))}
      </Form.Dropdown>

      <Form.TextField
        id="ref"
        title="Commit / Version"
        placeholder="e.g. a3f9c12 or v2.4.1"
        info="Full or short commit hash, tag, or version string"
      />

      <Form.DatePicker
        id="deployedAt"
        title="Deployed At"
        defaultValue={new Date()}
        info="When the deployment was done (defaults to now)"
      />

      <Form.TextField
        id="deployedBy"
        title="Deployed By"
        placeholder="Your name or initials (optional)"
      />

      <Form.TextArea
        id="notes"
        title="Notes"
        placeholder="What changed, ticket number, any context... (optional)"
      />
    </Form>
  );
}
