import {
  ActionPanel,
  Action,
  List,
  Icon,
  Form,
  useNavigation,
  Alert,
  confirmAlert,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getEnvironment, addEnvironmentVariables, deleteEnvironmentVariables } from "../api/environments";
import { EnvironmentVariable } from "../types/environment";

interface Props {
  environmentId: string;
  environmentName: string;
}

export default function EnvironmentVariables({ environmentId, environmentName }: Props) {
  const { data, isLoading, revalidate } = useCachedPromise((envId: string) => getEnvironment(envId), [environmentId]);

  const variables = data?.data.attributes.environment_variables ?? [];

  async function handleDelete(variable: EnvironmentVariable) {
    if (
      await confirmAlert({
        title: "Delete Variable",
        message: `Are you sure you want to delete "${variable.key}"?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting variable..." });
        await deleteEnvironmentVariables(environmentId, [variable.key]);
        await showToast({ style: Toast.Style.Success, title: "Variable deleted" });
        revalidate();
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to delete variable", message: String(error) });
      }
    }
  }

  return (
    <List isLoading={isLoading} navigationTitle={`${environmentName} — Environment Variables`}>
      <List.Section title="Actions">
        <List.Item
          icon={Icon.Plus}
          title="Add Variable"
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Variable"
                icon={Icon.Plus}
                target={<AddVariableForm environmentId={environmentId} onVariableAdded={revalidate} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title={`Variables (${variables.length})`}>
        {variables.map((variable) => (
          <VariableListItem
            key={variable.key}
            variable={variable}
            environmentId={environmentId}
            onDelete={() => handleDelete(variable)}
            onUpdated={revalidate}
          />
        ))}
      </List.Section>
    </List>
  );
}

function VariableListItem({
  variable,
  environmentId,
  onDelete,
  onUpdated,
}: {
  variable: EnvironmentVariable;
  environmentId: string;
  onDelete: () => void;
  onUpdated: () => void;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <List.Item
      icon={Icon.Key}
      title={variable.key}
      subtitle={revealed ? variable.value : "••••••••"}
      actions={
        <ActionPanel>
          <Action
            title={revealed ? "Hide Value" : "Reveal Value"}
            icon={revealed ? Icon.EyeDisabled : Icon.Eye}
            onAction={() => setRevealed(!revealed)}
          />
          <Action.Push
            title="Edit Variable"
            icon={Icon.Pencil}
            target={
              <EditVariableForm
                environmentId={environmentId}
                variableKey={variable.key}
                currentValue={variable.value}
                onVariableUpdated={onUpdated}
              />
            }
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action.CopyToClipboard
            title="Copy Value"
            content={variable.value}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <Action.CopyToClipboard
            title="Copy Key"
            content={variable.key}
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          />
          <Action
            title="Delete Variable"
            icon={Icon.Trash}
            onAction={onDelete}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
          />
        </ActionPanel>
      }
    />
  );
}

function AddVariableForm({ environmentId, onVariableAdded }: { environmentId: string; onVariableAdded: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { key: string; value: string }) {
    if (!values.key.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Key cannot be empty" });
      return;
    }

    try {
      await showToast({ style: Toast.Style.Animated, title: "Adding variable..." });
      await addEnvironmentVariables(environmentId, [{ key: values.key, value: values.value }], "append");
      await showToast({ style: Toast.Style.Success, title: "Variable added" });
      onVariableAdded();
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to add variable", message: String(error) });
    }
  }

  return (
    <Form
      navigationTitle="Add Variable"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Variable" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="key" title="Key" placeholder="MY_VARIABLE" />
      <Form.PasswordField id="value" title="Value" placeholder="my-value" />
    </Form>
  );
}

function EditVariableForm({
  environmentId,
  variableKey,
  currentValue,
  onVariableUpdated,
}: {
  environmentId: string;
  variableKey: string;
  currentValue: string;
  onVariableUpdated: () => void;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { value: string }) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Updating variable..." });
      await addEnvironmentVariables(environmentId, [{ key: variableKey, value: values.value }], "set");
      await showToast({ style: Toast.Style.Success, title: "Variable updated" });
      onVariableUpdated();
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to update variable", message: String(error) });
    }
  }

  return (
    <Form
      navigationTitle={`Edit ${variableKey}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update Variable" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.PasswordField id="value" title="Value" defaultValue={currentValue} />
    </Form>
  );
}
