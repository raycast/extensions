import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { setEnvVar } from "../utils/powershell.js";
import { EnvVar } from "../utils/types.js";

interface EditEnvVarFormProps {
  envVar: EnvVar;
  onSaved: () => void | Promise<void>;
}

export function EditEnvVarForm({ envVar, onSaved }: EditEnvVarFormProps) {
  const { pop } = useNavigation();
  const [value, setValue] = useState(envVar.value);

  async function handleSubmit() {
    try {
      if (envVar.scope === "Machine") {
        await showToast({
          style: Toast.Style.Animated,
          title: "Elevation required...",
          message: "Approve the UAC prompt",
        });
      }
      await setEnvVar(envVar.name, value, envVar.scope);
      await showToast({
        style: Toast.Style.Success,
        title: "Variable updated",
        message: envVar.name,
      });
      onSaved();
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
          title: "Failed to update variable",
          message,
        });
      }
    }
  }

  return (
    <Form
      navigationTitle={`Edit ${envVar.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Name" text={envVar.name} />
      <Form.TextArea
        id="value"
        title="Value"
        value={value}
        onChange={setValue}
      />
      <Form.Description
        title="Scope"
        text={envVar.scope === "Machine" ? "System" : "User"}
      />
    </Form>
  );
}
