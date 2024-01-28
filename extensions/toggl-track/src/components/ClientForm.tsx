import { ActionPanel, Form, Action, useNavigation } from "@raycast/api";
import { Workspace, Client, updateClient, createClient } from "../api";
import { withToast, Verb } from "../helpers/withToast";

interface ClientFormProps {
  client?: Client;
  workspace: Workspace;
  revalidateClients: () => void;
}

export default function ClientForm({ workspace, client, revalidateClients }: ClientFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={client ? "Rename" : "Create" + " Client"}
            onSubmit={({ name }: { name: string }) =>
              withToast({
                noun: "Client",
                verb: client ? Verb.Edit : Verb.Create,
                message: client?.name,
                action: async () => {
                  if (client) await updateClient(client.wid, client.id, name);
                  else await createClient(workspace.id, name);
                  revalidateClients();
                  pop();
                },
              })
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" defaultValue={client?.name} />
    </Form>
  );
}
