import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { $environments, saveVariable } from "../store/environments";
import { Variable } from "~/types";
import { useAtom } from "zod-persist/react";

interface VariableFormProps {
  environmentId: string;
  variableKey?: string;
}

export function VariableForm({ environmentId, variableKey }: VariableFormProps) {
  const { pop } = useNavigation();
  const { value: environments } = useAtom($environments);

  // Find the current value if we are editing an existing variable
  const environment = environments.find((e) => e.id === environmentId);
  const currentVariable = variableKey ? environment?.variables[variableKey] : undefined;

  // The 'values' from onSubmit will only contain 'key' if it's a new variable
  async function handleSubmit(values: { key?: string; value?: string; isSecret: boolean }) {
    // The key is either the one from the form (new) or the one passed in via props (editing)
    const keyToSave = (variableKey || values.key || "").trim();
    if (!keyToSave) {
      void showToast({ style: Toast.Style.Failure, title: "Variable key cannot be empty" });
      return;
    }

    if (!variableKey && environment?.variables[keyToSave]) {
      const confirmed = await confirmAlert({
        title: "Variable Already Exists",
        message: `A variable named "${keyToSave}" already exists. Do you want to overwrite it?`,
        primaryAction: { title: "Overwrite", style: Alert.ActionStyle.Destructive },
      });

      if (!confirmed) return;
    }

    const newValue = values.value ?? "";
    const variableData: Variable = {
      value: newValue,
      isSecret: values.isSecret,
    };

    await saveVariable(environmentId, keyToSave, variableData);
    void showToast({ title: "Variable Saved" });
    pop();
  }
  return (
    <Form
      navigationTitle={variableKey ? `Edit Variable "${variableKey}"` : "Create Variable"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Variable"
            icon={Icon.HardDrive}
            onSubmit={handleSubmit}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "s" },
              windows: { modifiers: ["ctrl"], key: "s" },
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title={`Environment`} text={environment?.name ?? ""} />
      {variableKey ? (
        // In edit mode, show a non-editable Description for the key
        <Form.Description title="Key" text={variableKey} />
      ) : (
        // In create mode, show an editable TextField for the key
        <Form.TextField id="key" title="Key" placeholder="e.g., authToken" />
      )}
      <Form.TextField
        id="value"
        title="Value"
        placeholder="Enter the secret or variable value"
        defaultValue={currentVariable?.value}
      />
      <Form.Checkbox id="isSecret" label="Is Secret" defaultValue={currentVariable?.isSecret} />
    </Form>
  );
}
