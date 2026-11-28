import { Action, ActionPanel, Form, Icon, PopToRootType, showHUD, useNavigation } from "@raycast/api";
import { upsertConnection } from "./storage.api";
import { ISSHConnection } from "./types";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";

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
    try {
      await upsertConnection(connection, connectionToEdit);
      if (isEditing) {
        pop();
      } else {
        await showHUD(`Connection ${connection.name} Saved`, { popToRootType: PopToRootType.Immediate });
      }
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Save Connection" });
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
