import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { getEnvVar, setEnvVar } from "../utils/powershell.js";
import { EnvScope } from "../utils/types.js";

interface AddEnvVarFormProps {
  onSaved?: () => void | Promise<void>;
}

export function AddEnvVarForm({ onSaved }: AddEnvVarFormProps) {
  const { pop } = useNavigation();
  const [nameError, setNameError] = useState<string | undefined>();

  function validateName(name: string): boolean {
    if (!name.trim()) {
      setNameError("Name is required");
      return false;
    }
    if (name.includes("=")) {
      setNameError("Name cannot contain '='");
      return false;
    }
    if (/\s/.test(name)) {
      setNameError("Name cannot contain whitespace");
      return false;
    }
    setNameError(undefined);
    return true;
  }

  async function handleSubmit(values: {
    name: string;
    value: string;
    scope: string;
  }) {
    if (!validateName(values.name)) return;

    const scope = values.scope as EnvScope;

    try {
      const existing = await getEnvVar(values.name, scope);
      if (existing !== null) {
        const confirmed = await confirmAlert({
          title: `Overwrite "${values.name}"?`,
          message: `This variable already exists in the ${scope === "Machine" ? "System" : "User"} scope. Overwrite it?`,
          primaryAction: {
            title: "Overwrite",
            style: Alert.ActionStyle.Destructive,
          },
        });
        if (!confirmed) return;
      }

      if (scope === "Machine") {
        await showToast({
          style: Toast.Style.Animated,
          title: "Elevation required...",
          message: "Approve the UAC prompt",
        });
      }

      await setEnvVar(values.name, values.value, scope);
      await showToast({
        style: Toast.Style.Success,
        title: "Variable created",
        message: values.name,
      });
      onSaved?.();
      pop();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("Access") || message.includes("denied")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Access denied",
          message: "UAC prompt was cancelled or insufficient permissions",
        });
      } else if (message.includes("timeout") || message.includes("TIMEOUT")) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Timeout",
          message: "PowerShell command timed out",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to create variable",
          message,
        });
      }
    }
  }

  return (
    <Form
      navigationTitle="Add New Variable"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Variable" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="MY_VARIABLE"
        error={nameError}
        onChange={(v) => validateName(v)}
      />
      <Form.TextArea id="value" title="Value" placeholder="Variable value" />
      <Form.Dropdown id="scope" title="Scope" defaultValue="User">
        <Form.Dropdown.Item value="User" title="User" />
        <Form.Dropdown.Item value="Machine" title="System (requires admin)" />
      </Form.Dropdown>
    </Form>
  );
}
