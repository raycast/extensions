import { ActionPanel, Form, showHUD, useNavigation, Action } from "@raycast/api";
import { nanoid } from "nanoid";
import { ISSHConnection } from "./types";
import { getConnections, saveConnections } from "./storage.api";

export default function Main() {
  const { pop } = useNavigation();

  async function saveConnection(connection: ISSHConnection) {
    const existingConnections = await getConnections();
    existingConnections.push({ ...connection, id: nanoid() });

    await saveConnections(existingConnections);
    await showHUD("Saved connection ✅");

    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={(values: ISSHConnection) => saveConnection(values)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Connection Name" />
      <Form.TextField id="address" title="Server Address" placeholder={"A resolvable DNS name or IP"} />
      <Form.TextField id="user" title="Username" placeholder={"A username to authenticate with"} />
      <Form.TextField id="port" title="Port (optional)" placeholder={"An optional custom port (other than 22)"} />
      <Form.TextField
        id="sshKey"
        title="SSH Key Location (optional)"
        placeholder={"An optional key path to authenticate with"}
      />
    </Form>
  );
}
