import { InvokeCommand, InvokeCommandInput } from "@aws-sdk/client-lambda";
import { Action, ActionPanel, Clipboard, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useState } from "react";
import { getLambdaClient } from "../../services/clients/lambda";
import { getAWSErrorMessage } from "../../errors";

interface InvokeLambdaFunctionProps {
  functionName: string;
}

interface SavedPayload {
  name: string;
  payload: string;
}

export default function InvokeLambdaFunction({ functionName }: InvokeLambdaFunctionProps) {
  const {
    value: lastPayload,
    setValue: setLastPayload,
    isLoading: isLoadingPayload,
  } = useLocalStorage<string>(`lastPayload_${functionName}`, "{}");

  const {
    value: savedPayloads,
    setValue: setSavedPayloads,
    isLoading: isLoadingSavedPayloads,
  } = useLocalStorage<SavedPayload[]>(`savedPayloads_${functionName}`, []);

  const [payload, setPayload] = useState<string | null>(null);
  const [saveName, setSaveName] = useState("");
  const { pop } = useNavigation();

  const isLoading = isLoadingPayload || isLoadingSavedPayloads;

  // Return loading form until LocalStorage data is ready
  if (isLoading) {
    return <Form isLoading={true} />;
  }

  // Use local state if user has edited, otherwise use stored value
  const currentPayload = payload ?? lastPayload ?? "{}";
  const currentSavedPayloads = savedPayloads ?? [];

  async function handleSubmit(values: { payload: string }) {
    try {
      const client = getLambdaClient();
      const input: InvokeCommandInput = {
        FunctionName: functionName,
        Payload: values.payload,
        InvocationType: "RequestResponse",
        LogType: "Tail",
      };
      const command = new InvokeCommand(input);
      const response = await client.send(command);

      const result = new TextDecoder().decode(response.Payload);
      const logs = response.LogResult ? atob(response.LogResult) : "No logs available";

      if (result && result !== "null") {
        await Clipboard.copy(result);
        await showToast({
          style: Toast.Style.Success,
          title: "Function Invoked Successfully",
          message: "Result copied to clipboard",
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "Function Invoked Successfully",
          message: "No result to copy",
        });
      }

      if (process.env.NODE_ENV === "development") {
        console.log("Result:", result);
        console.log("Logs:", logs);
      }

      // Save the last invoked payload
      await setLastPayload(values.payload);

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Invoking Function",
        message: getAWSErrorMessage(error),
      });
    }
  }

  async function handleSavePayload() {
    const trimmedName = saveName.trim();
    const trimmedPayload = currentPayload.trim();
    if (trimmedName && trimmedPayload) {
      const existingIndex = currentSavedPayloads.findIndex((sp) => sp.name === trimmedName);
      let newSavedPayloads;
      if (existingIndex !== -1) {
        newSavedPayloads = [...currentSavedPayloads];
        newSavedPayloads[existingIndex] = { name: trimmedName, payload: trimmedPayload };
      } else {
        newSavedPayloads = [...currentSavedPayloads, { name: trimmedName, payload: trimmedPayload }];
      }
      await setSavedPayloads(newSavedPayloads);
      setSaveName("");
      await showToast({
        style: Toast.Style.Success,
        title: "Payload Saved",
        message: `Saved as "${trimmedName}"`,
      });
    }
  }

  async function handleDeletePayload(nameToDelete: string) {
    const newSavedPayloads = currentSavedPayloads.filter((sp) => sp.name !== nameToDelete);
    await setSavedPayloads(newSavedPayloads);
    await showToast({
      style: Toast.Style.Success,
      title: "Payload Deleted",
      message: `Deleted "${nameToDelete}"`,
    });
  }

  function handleLoadPayload(savedPayload: SavedPayload) {
    setPayload(savedPayload.payload);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Invoke" onSubmit={handleSubmit} />
          <Action title="Save Payload" onAction={handleSavePayload} shortcut={{ modifiers: ["cmd"], key: "s" }} />
          <ActionPanel.Submenu title="Load Payload" shortcut={{ modifiers: ["cmd"], key: "l" }}>
            {currentSavedPayloads.map((savedPayload) => (
              <Action
                key={savedPayload.name}
                title={savedPayload.name}
                onAction={() => handleLoadPayload(savedPayload)}
              />
            ))}
          </ActionPanel.Submenu>
          <ActionPanel.Submenu title="Delete Payload" shortcut={{ modifiers: ["cmd"], key: "d" }}>
            {currentSavedPayloads.map((savedPayload) => (
              <Action
                key={savedPayload.name}
                title={savedPayload.name}
                onAction={() => handleDeletePayload(savedPayload.name)}
              />
            ))}
          </ActionPanel.Submenu>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="payload"
        title="Payload"
        placeholder='Enter JSON payload, e.g., {"key": "value"}'
        value={currentPayload}
        onChange={setPayload}
      />
      <Form.TextField
        id="saveName"
        title="Save Payload As"
        placeholder="Enter a name to save the current payload"
        value={saveName}
        onChange={setSaveName}
      />
    </Form>
  );
}
