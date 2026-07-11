import { useState, useEffect } from "react";
import { Action, ActionPanel, Form, useNavigation, showToast, Toast, Clipboard, LocalStorage } from "@raycast/api";
import { LambdaClient, InvokeCommand, InvokeCommandInput } from "@aws-sdk/client-lambda";

interface InvokeLambdaFunctionProps {
  functionName: string;
}

interface SavedPayload {
  name: string;
  payload: string;
}

export default function InvokeLambdaFunction({ functionName }: InvokeLambdaFunctionProps) {
  const [payload, setPayload] = useState("{}");
  const [savedPayloads, setSavedPayloads] = useState<SavedPayload[]>([]);
  const [saveName, setSaveName] = useState("");
  const { pop } = useNavigation();

  useEffect(() => {
    LocalStorage.getItem<string>(`lastPayload_${functionName}`).then((lastPayload) => {
      if (lastPayload) {
        setPayload(lastPayload);
      }
    });

    LocalStorage.getItem<string>(`savedPayloads_${functionName}`).then((savedPayloadsString) => {
      if (savedPayloadsString) {
        setSavedPayloads(JSON.parse(savedPayloadsString));
      }
    });
  }, [functionName]);

  const handleSubmit = async (values: { payload: string }) => {
    try {
      const client = new LambdaClient({});
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
      await LocalStorage.setItem(`lastPayload_${functionName}`, values.payload);

      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error Invoking Function",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleSavePayload = async () => {
    const trimmedName = saveName.trim();
    const trimmedPayload = payload.trim();
    if (trimmedName && trimmedPayload) {
      const existingIndex = savedPayloads.findIndex((sp) => sp.name === trimmedName);
      let newSavedPayloads;
      if (existingIndex !== -1) {
        newSavedPayloads = [...savedPayloads];
        newSavedPayloads[existingIndex] = { name: trimmedName, payload: trimmedPayload };
      } else {
        newSavedPayloads = [...savedPayloads, { name: trimmedName, payload: trimmedPayload }];
      }
      setSavedPayloads(newSavedPayloads);
      await LocalStorage.setItem(`savedPayloads_${functionName}`, JSON.stringify(newSavedPayloads));
      setSaveName("");
      await showToast({
        style: Toast.Style.Success,
        title: "Payload Saved",
        message: `Saved as "${trimmedName}"`,
      });
    }
  };

  const handleDeletePayload = async (nameToDelete: string) => {
    const newSavedPayloads = savedPayloads.filter((sp) => sp.name !== nameToDelete);
    setSavedPayloads(newSavedPayloads);
    await LocalStorage.setItem(`savedPayloads_${functionName}`, JSON.stringify(newSavedPayloads));
    await showToast({
      style: Toast.Style.Success,
      title: "Payload Deleted",
      message: `Deleted "${nameToDelete}"`,
    });
  };

  const handleLoadPayload = (savedPayload: SavedPayload) => {
    setPayload(savedPayload.payload);
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Invoke" onSubmit={handleSubmit} />
          <Action title="Save Payload" onAction={handleSavePayload} shortcut={{ modifiers: ["cmd"], key: "s" }} />
          <ActionPanel.Submenu title="Load Payload" shortcut={{ modifiers: ["cmd"], key: "l" }}>
            {savedPayloads.map((savedPayload) => (
              <Action
                key={savedPayload.name}
                title={savedPayload.name}
                onAction={() => handleLoadPayload(savedPayload)}
              />
            ))}
          </ActionPanel.Submenu>
          <ActionPanel.Submenu title="Delete Payload" shortcut={{ modifiers: ["cmd"], key: "d" }}>
            {savedPayloads.map((savedPayload) => (
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
        value={payload}
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
