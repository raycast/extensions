import { ActionPanel, Form, showHUD, SubmitFormAction, useNavigation } from "@raycast/api";
import { ISSHConnection } from "./types";
import { getConnections, saveConnections } from "./storage.api";
import { createId } from "./utils";

export default function Main() {
  const { pop } = useNavigation();

  async function saveConnection(connection: ISSHConnection) {
    const existingConnections = await getConnections();
    existingConnections.push({ ...connection, id: createId() });

    await saveConnections(existingConnections);
    await showHUD("Saved connection ✅");

    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction title="Save" onSubmit={(values) => saveConnection(values as ISSHConnection)} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Connection Name" />
      <Form.TextField id="address" title="Server Address" placeholder={"A resolvable DNS name or IP"} />
      <Form.TextField id="user" title="Username" placeholder={"A username to authenticate with"} />
      <Form.TextField
        id="key"
        title="SSH Key Location (optional)"
        placeholder={"An optional key path to authenticate with"}
      />
    </Form>
  );
}
