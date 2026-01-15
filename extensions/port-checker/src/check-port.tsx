import { Form, ActionPanel, Action, Toast, showToast } from "@raycast/api";
import net from "net";

type Values = {
  hostField: string;
  portField: string;
  timeoutField: string;
};

export default function Command() {
  async function handleSubmit(values: Values) {
    const host = values.hostField;
    const portField = values.portField;
    const timeoutField = values.timeoutField;

    const re = /^[0-9]+$/;
    if (!(re.test(portField) && +portField >= 1 && +portField <= 65535)) {
      showToast({
        title: "Invalid Port",
        message: `Port: ${portField} is invalid (must be a number between 1 and 65535)`,
        style: Toast.Style.Failure,
      });
      return;
    }

    if (!re.test(timeoutField)) {
      showToast({ title: "Invalid Timeout", message: "Please enter a positive integer", style: Toast.Style.Failure });
      return;
    }

    const port = +portField;
    const timeout = +timeoutField;

    console.log(`Creating TCP connection to ${host}:${port}`);
    const toast = await showToast({
      title: "Checking Port",
      message: `Checking if port ${port} is open on host ${host}.`,
      style: Toast.Style.Animated,
    });

    const valid = await checkTCP(host, port, timeout);
    await toast.hide();
    if (valid) {
      await showToast({ title: "Open", message: `Port ${port} on host ${host} is open!`, style: Toast.Style.Success });
    } else {
      await showToast({
        title: "Closed",
        message: `Port ${port} on host ${host} is closed!`,
        style: Toast.Style.Failure,
      });
    }
  }

  async function checkTCP(host: string, port: number, timeoutMs = 3000): Promise<boolean> {
    return new Promise((resolve) => {
      const client = new net.Socket();

      client.setTimeout(timeoutMs);

      client.once("connect", () => {
        client.destroy();
        resolve(true);
      });

      client.once("timeout", () => {
        client.destroy();
        resolve(false);
      });

      client.once("error", () => {
        client.destroy();
        resolve(false);
      });

      client.connect(port, host);
    });
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Check If A Port Is Open" />
      <Form.TextField id="hostField" title="Host" placeholder="Enter host" defaultValue="127.0.0.1" />
      <Form.TextField id="portField" title="Port" placeholder="Enter port" defaultValue="8080" />
      <Form.TextField id="timeoutField" title="Timeout (ms)" placeholder="Enter timeout (ms)" defaultValue="3000" />
    </Form>
  );
}
