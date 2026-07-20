import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import ClientForm from "./components/ClientForm";
import { deleteClient, getClients, getInvoiceCountForClient } from "./lib/storage";
import { Client } from "./lib/types";

export default function ManageClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [invoiceCounts, setInvoiceCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  const loadClients = useCallback(async () => {
    setIsLoading(true);
    const data = await getClients();
    setClients(data);

    const counts: Record<string, number> = {};
    for (const client of data) {
      counts[client.id] = await getInvoiceCountForClient(client.id);
    }
    setInvoiceCounts(counts);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const fetchClients = async () => {
      try {
        setIsLoading(true);
        const data = await getClients();
        if (isCancelled) return;
        setClients(data);

        const counts: Record<string, number> = {};
        for (const client of data) {
          if (isCancelled) break;
          counts[client.id] = await getInvoiceCountForClient(client.id);
        }
        if (isCancelled) return;
        setInvoiceCounts(counts);
      } catch (err) {
        if (!isCancelled) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to load clients",
            message: String(err),
          });
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    fetchClients();

    return () => {
      isCancelled = true;
    };
  }, [loadClients]);

  async function handleDelete(client: Client) {
    const count = invoiceCounts[client.id] ?? 0;
    if (count > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Cannot delete client",
        message: `${client.name} has ${count} invoice${count === 1 ? "" : "s"}. Delete their invoices first.`,
      });
      return;
    }

    if (
      await confirmAlert({
        title: "Delete Client",
        message: `Are you sure you want to delete "${client.name}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      await deleteClient(client.id);
      await showToast({ style: Toast.Style.Success, title: "Client deleted" });
      await loadClients();
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search clients...">
      {clients.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Clients"
          description="Add your first client to get started."
          actions={
            <ActionPanel>
              <Action title="Add Client" icon={Icon.Plus} onAction={() => push(<ClientForm onSaved={loadClients} />)} />
            </ActionPanel>
          }
        />
      ) : (
        clients.map((client) => (
          <List.Item
            key={client.id}
            title={client.name}
            subtitle={client.email}
            accessories={[
              {
                text: `${invoiceCounts[client.id] ?? 0} invoice${(invoiceCounts[client.id] ?? 0) === 1 ? "" : "s"}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Edit Client"
                  icon={Icon.Pencil}
                  onAction={() => push(<ClientForm client={client} onSaved={loadClients} />)}
                />
                <Action
                  title="Add Client"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() => push(<ClientForm onSaved={loadClients} />)}
                />
                <Action
                  title="Delete Client"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() => handleDelete(client)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
