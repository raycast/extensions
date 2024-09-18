import { ActionPanel, Form, Action, useNavigation } from "@raycast/api";

import { Workspace, Client, updateClient, createClient } from "@/api";
import { withToast, Verb } from "@/helpers/withToast";

type ClientFormProps =
  | {
      client: Client;
      workspaces?: never;
      revalidateClients: () => void;
    }
  | {
      client?: never;
      workspaces: Workspace[];
      revalidateClients: () => void;
    };

export default function ClientForm({ client, workspaces, revalidateClients }: ClientFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={client ? "Rename" : "Create" + " Client"}
            onSubmit={({ name, workspaceId }: { name: string; workspaceId: string }) =>
              withToast({
                noun: "Client",
                verb: client ? Verb.Edit : Verb.Create,
                message: client?.name,
                action: async () => {
                  if (client) await updateClient(client.wid, client.id, name);
                  else await createClient(parseInt(workspaceId), name);
                  revalidateClients();
                  pop();
                },
              })
            }
          />
        </ActionPanel>
      }
    >
      {!client && (
        <Form.Dropdown id="workspaceId" title="Workspace">
          {workspaces.map((workspace) => (
            <Form.Dropdown.Item key={workspace.id} title={workspace.name} value={workspace.id.toString()} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField id="name" title="Name" defaultValue={client?.name} />
    </Form>
  );
}
