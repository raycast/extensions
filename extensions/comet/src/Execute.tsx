import { Form, ActionPanel, Action, showToast, Icon, Color, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

type Values = {
  scriptInput: string;
};

const START_PORT = 6969;
const END_PORT = 7069;

export default function Command() {
  const [serverPort, setServerPort] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    async function findHydrogenServer() {
      setIsConnecting(true);
      setConnectionError(null);

      let lastError = "";

      for (let port = START_PORT; port <= END_PORT; port++) {
        try {
          const res = await fetch(`http://127.0.0.1:${port}/secret`, {
            method: "GET",
          });

          if (res.ok && (await res.text()) === "0xdeadbeef") {
            setServerPort(port);
            setIsConnecting(false);
            return;
          }
        } catch (error: unknown) {
          lastError = error instanceof Error ? error.message : String(error);
        }
      }

      setConnectionError(
        `Could not locate Hydrogen server on ports ${START_PORT}-${END_PORT}. Last error: ${lastError}`,
      );
      setIsConnecting(false);
    }

    findHydrogenServer();
  }, []);

  async function executeScript(scriptContent: string) {
    if (!serverPort) {
      throw new Error(`Could not locate Hydrogen server on ports ${START_PORT}-${END_PORT}`);
    }

    const response = await fetch(`http://127.0.0.1:${serverPort}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: scriptContent,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.text();
  }

  async function handleSubmit(values: Values) {
    if (!serverPort) {
      showToast({
        style: Toast.Style.Failure,
        title: "Not Connected",
        message: "Cannot execute scripts without Hydrogen connection",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Executing Script",
    });

    try {
      const result = await executeScript(values.scriptInput);

      toast.style = Toast.Style.Success;
      toast.title = "Script Executed";
      toast.message = "Check Roblox for results";

      console.log("Execution result:", result);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Execution Failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  function getConnectionStatus() {
    if (isConnecting) {
      return "Connecting to Hydrogen...";
    } else if (serverPort) {
      return `Connected to Hydrogen on port ${serverPort}`;
    } else {
      return "Not connected to Hydrogen";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Execute Script"
            icon={{ source: Icon.Play, tintColor: Color.Green }}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
      navigationTitle="Quick execution"
    >
      <Form.Description title="Hydrogen Script Executor" text="Quickly run Lua scripts in your Roblox games" />
      <Form.TextArea
        id="scriptInput"
        title=""
        placeholder="-- Enter your Lua script here..."
        enableMarkdown={false}
        info={
          isConnecting
            ? "Connecting to Hydrogen..."
            : serverPort
              ? "Ready to execute scripts"
              : "⚠️ Not connected to Hydrogen"
        }
      />

      <Form.Separator />
      <Form.Description
        title={isConnecting ? "Connecting..." : serverPort ? "Connection Status" : "Connection Error"}
        text={connectionError || getConnectionStatus()}
      />
    </Form>
  );
}
