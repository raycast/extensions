import { Action, ActionPanel, Form, Icon, PopToRootType, showHUD, showToast, Toast, useNavigation } from "@raycast/api";
import { nanoid } from "nanoid";
import { getConnections, saveConnections } from "./storage.api";
import { ISSHConnection } from "./types";
import { FormValidation, useForm } from "@raycast/utils";

interface CreateProps {
  connectionToEdit?: ISSHConnection;
  connectionToDuplicate?: ISSHConnection;
  duplicateName?: string;
}

export default function Main({ connectionToEdit, connectionToDuplicate, duplicateName }: CreateProps) {
  const isEditing = !!connectionToEdit;
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<ISSHConnection>({
    onSubmit(values) {
      saveConnection(values);
    },
    validation: {
      name: FormValidation.Required,
    },
    initialValues: connectionToEdit ?? {
      ...connectionToDuplicate,
      name: duplicateName,
    },
  });

  async function saveConnection(connection: ISSHConnection) {
    const existingConnections = await getConnections();
    const nameAlreadyExists = existingConnections.some(
      (existingConnection) =>
        existingConnection.name === connection.name && existingConnection.id !== connectionToEdit?.id,
    );

    if (nameAlreadyExists) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Connection name already exists",
        message: "Choose a unique connection name.",
      });
      return;
    }

    if (isEditing) {
      const existingConnectionIdx = existingConnections.findIndex((conn) => conn.id === connectionToEdit!.id);
      if (existingConnectionIdx !== -1) {
        existingConnections.splice(existingConnectionIdx, 1);
      }
    }
    existingConnections.push({ ...connection, id: isEditing ? connectionToEdit!.id : nanoid() });

    await saveConnections(existingConnections);

    if (isEditing) {
      pop();
    } else {
      await showHUD(`✅ Connection [${connection.name}] saved!`, {
        popToRootType: PopToRootType.Immediate,
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.SaveDocument} title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Connection Name" {...itemProps.name} />
      <Form.TextField title="Server Address" placeholder={"A resolvable DNS name or IP"} {...itemProps.address} />
      <Form.TextField title="Username (optional)" placeholder={"A username to authenticate with"} {...itemProps.user} />
      <Form.TextField
        title="Port (optional)"
        placeholder={"An optional custom port (other than 22)"}
        {...itemProps.port}
      />
      <Form.TextField
        title="SSH Key Location (optional)"
        placeholder={"An optional key path to authenticate with"}
        {...itemProps.sshKey}
      />
      <Form.TextField
        title="Command to Execute (optional)"
        placeholder={"An optional command to execute on the remote server after connecting"}
        {...itemProps.command}
      />
    </Form>
  );
}
