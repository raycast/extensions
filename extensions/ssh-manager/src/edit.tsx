import { ActionPanel, Form, showHUD, useNavigation, Action } from "@raycast/api";
import { ISSHConnection } from "./types";
import { getConnections, saveConnections } from "./storage.api";

interface EditConnectionProps {
  connection: ISSHConnection;
  onConnectionUpdated: (updatedConnection: ISSHConnection) => void;
}

export default function EditConnection({ connection, onConnectionUpdated }: EditConnectionProps) {
  const { pop } = useNavigation();

  async function updateConnection(values: Omit<ISSHConnection, "id">) {
    const updatedConnection: ISSHConnection = { ...values, id: connection.id };
    const existingConnections = await getConnections();
    const updatedConnections = existingConnections.map((c) =>
      c.id === connection.id ? updatedConnection : c
    );

    await saveConnections(updatedConnections);
    onConnectionUpdated(updatedConnection);
    await showHUD("Connection updated ✅");

    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={(values: Omit<ISSHConnection, "id">) => updateConnection(values)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Connection Name" defaultValue={connection.name} />
      <Form.TextField
        id="address"
        title="Server Address"
        placeholder={"A resolvable DNS name or IP"}
        defaultValue={connection.address}
      />
      <Form.TextField
        id="user"
        title="Username"
        placeholder={"A username to authenticate with"}
        defaultValue={connection.user}
      />
      <Form.TextField
        id="port"
        title="Port (optional)"
        placeholder={"An optional custom port (other than 22)"}
        defaultValue={connection.port}
      />
      <Form.TextField
        id="sshKey"
        title="SSH Key Location (optional)"
        placeholder={"An optional key path to authenticate with"}
        defaultValue={connection.sshKey}
      />
    </Form>
  );
}
