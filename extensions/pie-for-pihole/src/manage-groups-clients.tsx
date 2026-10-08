import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Form,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getPiholeAPI } from "./api/client";
import type { ConfiguredClient, DomainEntry, Group } from "./api/types";
import { isV6 } from "./utils";

function CreateGroupForm({ onCreated }: { onCreated: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string; comment: string }) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Creating group...",
      });
      await getPiholeAPI().createGroup(values.name, values.comment || undefined);
      await showToast({ style: Toast.Style.Success, title: "Group created" });
      onCreated();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create group",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      navigationTitle="Create Group"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Group" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Name" placeholder="my-group" />
      <Form.TextField id="comment" title="Comment" placeholder="Optional description" />
    </Form>
  );
}

function AddClientToGroupForm({
  group,
  allClients,
  groupClients,
  onAdded,
}: {
  group: Group;
  allClients: ConfiguredClient[];
  groupClients: ConfiguredClient[];
  onAdded: () => void;
}) {
  const { pop } = useNavigation();
  const groupClientIds = new Set(groupClients.map((c) => c.client));
  const availableClients = allClients.filter((c) => !groupClientIds.has(c.client));

  async function handleSubmit(values: { client: string }) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Adding client to group...",
      });
      const client = allClients.find((c) => c.client === values.client);
      if (!client) return;
      const currentGroups = (client.groups ?? []).map(Number);
      const groupId = group.id ?? 0;
      if (!currentGroups.includes(groupId)) {
        currentGroups.push(groupId);
      }
      await getPiholeAPI().updateClientGroups(client.client, currentGroups);
      await showToast({
        style: Toast.Style.Success,
        title: "Client added to group",
      });
      onAdded();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add client",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      navigationTitle={`Add Client to ${group.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add to Group" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="client" title="Client">
        {availableClients.map((c) => (
          <Form.Dropdown.Item key={c.client} value={c.client} title={c.name || c.client} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function AddDomainToGroupForm({
  group,
  allDomains,
  groupDomains,
  onAdded,
}: {
  group: Group;
  allDomains: DomainEntry[];
  groupDomains: DomainEntry[];
  onAdded: () => void;
}) {
  const { pop } = useNavigation();
  const groupDomainIds = new Set(groupDomains.map((d) => d.id));
  const availableDomains = allDomains.filter((d) => !groupDomainIds.has(d.id));

  async function handleSubmit(values: { domainId: string }) {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Adding domain to group...",
      });
      const domain = allDomains.find((d) => String(d.id) === values.domainId);
      if (!domain) return;
      const currentGroups = (domain.groups ?? []).map(Number);
      const groupId = group.id ?? 0;
      if (!currentGroups.includes(groupId)) {
        currentGroups.push(groupId);
      }
      await getPiholeAPI().updateDomainGroups(domain.type, domain.kind, domain.domain, currentGroups);
      await showToast({
        style: Toast.Style.Success,
        title: "Domain added to group",
      });
      onAdded();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add domain",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <Form
      navigationTitle={`Add Domain to ${group.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add to Group" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="domainId" title="Domain">
        {availableDomains.map((d) => (
          <Form.Dropdown.Item key={d.id} value={String(d.id)} title={`${d.domain} (${d.type}/${d.kind})`} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function GroupDetail({
  group,
  clients,
  domains,
  allClients,
  allDomains,
  onChanged,
}: {
  group: Group;
  clients: ConfiguredClient[];
  domains: DomainEntry[];
  allClients: ConfiguredClient[];
  allDomains: DomainEntry[];
  onChanged: () => void;
}) {
  const { push } = useNavigation();

  async function handleRemoveClient(client: ConfiguredClient) {
    try {
      const currentGroups = (client.groups ?? []).map(Number);
      const groupId = group.id ?? 0;
      const newGroups = currentGroups.filter((g) => g !== groupId);
      await getPiholeAPI().updateClientGroups(client.client, newGroups);
      await showToast({
        style: Toast.Style.Success,
        title: "Client removed from group",
      });
      onChanged();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to remove client",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleRemoveDomain(domain: DomainEntry) {
    try {
      const currentGroups = (domain.groups ?? []).map(Number);
      const groupId = group.id ?? 0;
      const newGroups = currentGroups.filter((g) => g !== groupId);
      await getPiholeAPI().updateDomainGroups(domain.type, domain.kind, domain.domain, newGroups);
      await showToast({
        style: Toast.Style.Success,
        title: "Domain removed from group",
      });
      onChanged();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to remove domain",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return (
    <List navigationTitle={`Group: ${group.name}`} searchBarPlaceholder="Search members">
      <List.Section title={`Clients (${clients.length})`}>
        {clients.map((client) => (
          <List.Item
            key={client.id}
            title={client.name || client.client}
            subtitle={client.comment ?? undefined}
            icon={{ source: Icon.Monitor, tintColor: Color.Blue }}
            accessories={[{ text: client.client }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Client" content={client.client} />
                <Action
                  title="Remove from Group"
                  icon={{ source: Icon.Minus, tintColor: Color.Red }}
                  style={Action.Style.Destructive}
                  onAction={() => handleRemoveClient(client)}
                />
                <Action
                  title="Add Client to Group"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() =>
                    push(
                      <AddClientToGroupForm
                        group={group}
                        allClients={allClients}
                        groupClients={clients}
                        onAdded={onChanged}
                      />,
                    )
                  }
                />
              </ActionPanel>
            }
          />
        ))}
        {clients.length === 0 && (
          <List.Item
            title="No clients in this group"
            icon={Icon.Minus}
            actions={
              <ActionPanel>
                <Action
                  title="Add Client to Group"
                  icon={Icon.Plus}
                  onAction={() =>
                    push(
                      <AddClientToGroupForm
                        group={group}
                        allClients={allClients}
                        groupClients={clients}
                        onAdded={onChanged}
                      />,
                    )
                  }
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Section title={`Domains (${domains.length})`}>
        {domains.map((domain) => (
          <List.Item
            key={domain.id}
            title={domain.domain}
            subtitle={`${domain.type} / ${domain.kind}`}
            icon={{
              source: domain.type === "deny" ? Icon.XMarkCircle : Icon.Checkmark,
              tintColor: domain.type === "deny" ? Color.Red : Color.Green,
            }}
            accessories={[
              {
                tag: {
                  value: domain.enabled ? "enabled" : "disabled",
                  color: domain.enabled ? Color.Green : Color.SecondaryText,
                },
              },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Domain" content={domain.domain} />
                <Action
                  title="Remove from Group"
                  icon={{ source: Icon.Minus, tintColor: Color.Red }}
                  style={Action.Style.Destructive}
                  onAction={() => handleRemoveDomain(domain)}
                />
                <Action
                  title="Add Domain to Group"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={() =>
                    push(
                      <AddDomainToGroupForm
                        group={group}
                        allDomains={allDomains}
                        groupDomains={domains}
                        onAdded={onChanged}
                      />,
                    )
                  }
                />
              </ActionPanel>
            }
          />
        ))}
        {domains.length === 0 && (
          <List.Item
            title="No domains in this group"
            icon={Icon.Minus}
            actions={
              <ActionPanel>
                <Action
                  title="Add Domain to Group"
                  icon={Icon.Plus}
                  onAction={() =>
                    push(
                      <AddDomainToGroupForm
                        group={group}
                        allDomains={allDomains}
                        groupDomains={domains}
                        onAdded={onChanged}
                      />,
                    )
                  }
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}

interface GroupsClientsData {
  groups: Group[];
  clients: ConfiguredClient[];
  domains: DomainEntry[];
}

export default function ManageGroupsClients() {
  if (!isV6()) {
    return (
      <Detail
        markdown="## This command requires Pi-hole v6\n\nPlease update your Pi-hole version in the extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  const { push } = useNavigation();

  const { isLoading, data, mutate, revalidate } = useCachedPromise(async (): Promise<GroupsClientsData> => {
    const api = getPiholeAPI();
    const [groups, clients, domains] = await Promise.all([api.getGroups(), api.getClients(), api.getDomains()]);
    return { groups, clients, domains };
  });

  const groups = data?.groups ?? [];
  const clients = data?.clients ?? [];
  const domains = data?.domains ?? [];

  async function handleToggleGroup(name: string, enabled: boolean) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${!enabled ? "Enabling" : "Disabling"} group...`,
    });
    try {
      await mutate(getPiholeAPI().toggleGroup(name, !enabled), {
        optimisticUpdate(data) {
          if (!data) return data;
          return {
            ...data,
            groups: data.groups.map((g) => (g.name === name ? { ...g, enabled: !enabled } : g)),
          };
        },
      });
      toast.style = Toast.Style.Success;
      toast.title = `Group ${!enabled ? "enabled" : "disabled"}`;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to toggle group";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }

  async function handleDeleteGroup(name: string) {
    if (
      await confirmAlert({
        title: "Delete Group",
        message: `Are you sure you want to delete the group "${name}"?`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      })
    ) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Deleting group...",
      });
      try {
        await mutate(getPiholeAPI().deleteGroup(name), {
          optimisticUpdate(data) {
            if (!data) return data;
            return {
              ...data,
              groups: data.groups.filter((g) => g.name !== name),
            };
          },
        });
        toast.style = Toast.Style.Success;
        toast.title = "Group deleted";
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed to delete group";
        toast.message = error instanceof Error ? error.message : "Unknown error";
      }
    }
  }

  function clientsForGroup(groupName: string): ConfiguredClient[] {
    return clients.filter((c) => c.groups.includes(groupName));
  }

  function domainsForGroup(groupName: string): DomainEntry[] {
    return domains.filter((d) => d.groups.includes(groupName));
  }

  return (
    <List isLoading={isLoading} navigationTitle="Groups & Clients" searchBarPlaceholder="Search groups and clients">
      <List.EmptyView title="No groups or clients configured" />
      <List.Section title="Groups">
        {groups.map((group) => {
          const gc = clientsForGroup(group.name);
          const gd = domainsForGroup(group.name);
          return (
            <List.Item
              key={group.name}
              title={group.name}
              subtitle={group.comment ?? undefined}
              icon={{
                source: Icon.TwoPeople,
                tintColor: group.enabled ? Color.Green : Color.SecondaryText,
              }}
              accessories={[
                {
                  text: `${gc.length} client${gc.length !== 1 ? "s" : ""}, ${gd.length} domain${
                    gd.length !== 1 ? "s" : ""
                  }`,
                },
                {
                  tag: {
                    value: group.enabled ? "enabled" : "disabled",
                    color: group.enabled ? Color.Green : Color.SecondaryText,
                  },
                },
              ]}
              actions={
                <ActionPanel title="Actions">
                  <Action
                    title="View Members"
                    icon={Icon.Eye}
                    onAction={() =>
                      push(
                        <GroupDetail
                          group={group}
                          clients={gc}
                          domains={gd}
                          allClients={clients}
                          allDomains={domains}
                          onChanged={revalidate}
                        />,
                      )
                    }
                  />
                  <Action
                    title={group.enabled ? "Disable Group" : "Enable Group"}
                    icon={group.enabled ? Icon.XMarkCircle : Icon.CheckCircle}
                    onAction={() => handleToggleGroup(group.name, group.enabled)}
                  />
                  <Action
                    title="Delete Group"
                    icon={{ source: Icon.Trash, tintColor: Color.Red }}
                    style={Action.Style.Destructive}
                    onAction={() => handleDeleteGroup(group.name)}
                  />
                  <Action
                    title="Create New Group"
                    icon={Icon.Plus}
                    shortcut={{ modifiers: ["cmd"], key: "n" }}
                    onAction={() => push(<CreateGroupForm onCreated={revalidate} />)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="Clients">
        {clients.map((client) => (
          <List.Item
            key={client.id}
            title={client.name || client.client}
            subtitle={client.comment ?? undefined}
            icon={{ source: Icon.Monitor, tintColor: Color.Blue }}
            accessories={[
              {
                text: `${client.groups.length} group${client.groups.length !== 1 ? "s" : ""}`,
              },
            ]}
            actions={
              <ActionPanel title="Actions">
                <Action.CopyToClipboard title="Copy Client" content={client.client} />
                {client.name && <Action.CopyToClipboard title="Copy Name" content={client.name} />}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
