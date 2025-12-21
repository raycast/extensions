import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Form,
  Color,
  confirmAlert,
  Alert,
} from "@raycast/api";
import React, { useState, useEffect } from "react";
import { Environment, KeyValue } from "./types";
import { getEnvironments, saveEnvironments } from "./storage";
import { generateId } from "./utils";

export default function Environments() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEnvironments();
  }, []);

  async function loadEnvironments() {
    setIsLoading(true);
    const data = await getEnvironments();
    setEnvironments(data);
    setIsLoading(false);
  }

  async function setActiveEnvironment(id: string) {
    const updated = environments.map((env) => ({
      ...env,
      isActive: env.id === id,
    }));
    await saveEnvironments(updated);
    setEnvironments(updated);
    await showToast({
      style: Toast.Style.Success,
      title: "Environment Activated",
    });
  }

  async function deleteEnvironment(id: string) {
    if (
      await confirmAlert({
        title: "Delete Environment",
        message: "Are you sure you want to delete this environment?",
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      const updated = environments.filter((e) => e.id !== id);
      await saveEnvironments(updated);
      setEnvironments(updated);
      await showToast({
        style: Toast.Style.Success,
        title: "Environment Deleted",
      });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search environments...">
      <List.EmptyView
        title="No Environments"
        description="Create your first environment to manage variables"
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Environment"
              icon={Icon.Plus}
              target={<CreateEnvironmentForm onCreated={loadEnvironments} />}
            />
          </ActionPanel>
        }
      />

      {environments.map((env) => (
        <List.Item
          key={env.id}
          title={env.name}
          icon={{
            source: env.isActive ? Icon.CheckCircle : Icon.Circle,
            tintColor: env.isActive ? Color.Green : Color.SecondaryText,
          }}
          accessories={[
            {
              text: `${env.variables.filter((v) => v.enabled).length} variable${env.variables.filter((v) => v.enabled).length !== 1 ? "s" : ""}`,
            },
            ...(env.isActive
              ? [{ tag: { value: "Active", color: Color.Green } }]
              : []),
          ]}
          actions={
            <ActionPanel>
              {!env.isActive && (
                <Action
                  title="Set as Active"
                  icon={Icon.CheckCircle}
                  onAction={() => setActiveEnvironment(env.id)}
                />
              )}
              <Action.Push
                title="Edit Environment"
                icon={Icon.Pencil}
                target={
                  <EditEnvironmentForm
                    environment={env}
                    onUpdated={loadEnvironments}
                  />
                }
                shortcut={{ modifiers: ["cmd"], key: "e" }}
              />
              <Action
                title="Delete Environment"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => deleteEnvironment(env.id)}
                shortcut={{ modifiers: ["ctrl"], key: "d" }}
              />
              <ActionPanel.Section>
                <Action.Push
                  title="Create Environment"
                  icon={Icon.Plus}
                  target={
                    <CreateEnvironmentForm onCreated={loadEnvironments} />
                  }
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CreateEnvironmentForm({ onCreated }: { onCreated: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: Form.Values) {
    try {
      const variables: KeyValue[] = [];
      for (let i = 0; i < 10; i++) {
        const varInput = values[`var_key_${i}`];
        if (varInput && varInput.trim()) {
          // Parse key=value format
          const parts = varInput.split("=");
          if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join("=").trim(); // Handle values with = in them
            if (key) {
              variables.push({
                id: generateId(),
                key,
                value,
                enabled: true,
              });
            }
          }
        }
      }

      const environments = await getEnvironments();
      const newEnvironment: Environment = {
        id: generateId(),
        name: values.name,
        variables,
        isActive: environments.length === 0, // First environment is active by default
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveEnvironments([...environments, newEnvironment]);
      await showToast({
        style: Toast.Style.Success,
        title: "Environment Created",
      });
      onCreated();
      pop();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Create Environment",
        message: errorMessage,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Environment"
            onSubmit={handleSubmit}
            icon={Icon.Plus}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="Development" />
      <Form.Separator />
      <Form.Description text="Variables (use {{variableName}} in requests)" />
      {[0, 1, 2, 3, 4].map((i) => (
        <Form.TextField
          key={`var_${i}`}
          id={`var_key_${i}`}
          title={`Variable ${i + 1}`}
          placeholder="API_URL=https://api.dev.example.com"
        />
      ))}
    </Form>
  );
}

function EditEnvironmentForm({
  environment,
  onUpdated,
}: {
  environment: Environment;
  onUpdated: () => void;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: Form.Values) {
    try {
      const variables: KeyValue[] = [];
      for (let i = 0; i < 10; i++) {
        const varInput = values[`var_key_${i}`];
        if (varInput && varInput.trim()) {
          // Parse key=value format
          const parts = varInput.split("=");
          if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join("=").trim(); // Handle values with = in them
            if (key) {
              variables.push({
                id: generateId(),
                key,
                value,
                enabled: true,
              });
            }
          }
        }
      }

      const environments = await getEnvironments();
      const updated = environments.map((e) => {
        if (e.id === environment.id) {
          return {
            ...e,
            name: values.name,
            variables,
            updatedAt: new Date().toISOString(),
          };
        }
        return e;
      });

      await saveEnvironments(updated);
      await showToast({
        style: Toast.Style.Success,
        title: "Environment Updated",
      });
      onUpdated();
      pop();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Update Environment",
        message: errorMessage,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            onSubmit={handleSubmit}
            icon={Icon.Check}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="Development"
        defaultValue={environment.name}
      />
      <Form.Separator />
      <Form.Description text="Variables (use {{variableName}} in requests)" />
      {[0, 1, 2, 3, 4].map((i) => {
        const variable = environment.variables[i];
        return (
          <Form.TextField
            key={`var_${i}`}
            id={`var_key_${i}`}
            title={`Variable ${i + 1}`}
            placeholder="API_URL=https://api.dev.example.com"
            defaultValue={variable ? `${variable.key}=${variable.value}` : ""}
          />
        );
      })}
    </Form>
  );
}
