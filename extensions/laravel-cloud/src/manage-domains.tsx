import {
  ActionPanel,
  Action,
  List,
  Icon,
  Form,
  useNavigation,
  Alert,
  confirmAlert,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useAppEnvSelector } from "./components/app-env-selector";
import { listDomains, createDomain, deleteDomain, verifyDomain } from "./api/domains";
import { Domain } from "./types/domain";
import { getDomainStatusIcon } from "./utils/status-icons";
import { timeAgo } from "./utils/dates";

export default function ManageDomains() {
  const { environmentId, isLoading: selectorLoading, Dropdown } = useAppEnvSelector();

  const { data, isLoading, revalidate } = useCachedPromise((envId: string) => listDomains(envId), [environmentId], {
    execute: !!environmentId,
    keepPreviousData: true,
  });

  async function handleDelete(domain: Domain) {
    if (
      await confirmAlert({
        title: "Delete Domain",
        message: `Are you sure you want to delete "${domain.attributes.name}"?`,
        primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
      })
    ) {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Deleting domain..." });
        await deleteDomain(domain.id);
        await showToast({ style: Toast.Style.Success, title: "Domain deleted" });
        revalidate();
      } catch (error) {
        await showToast({ style: Toast.Style.Failure, title: "Failed to delete domain", message: String(error) });
      }
    }
  }

  async function handleVerify(domain: Domain) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Verifying domain..." });
      await verifyDomain(domain.id);
      await showToast({ style: Toast.Style.Success, title: "Verification triggered" });
      revalidate();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to verify domain", message: String(error) });
    }
  }

  return (
    <List
      isLoading={selectorLoading || isLoading}
      searchBarPlaceholder="Search domains..."
      searchBarAccessory={<Dropdown />}
    >
      {environmentId && (
        <List.Section title="Actions">
          <List.Item
            icon={Icon.Plus}
            title="Add Domain"
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add Domain"
                  icon={Icon.Plus}
                  target={<AddDomainForm environmentId={environmentId} onDomainAdded={revalidate} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title="Domains">
        {data?.data.map((domain) => {
          const hostnameIcon = getDomainStatusIcon(domain.attributes.hostname_status);
          const sslIcon = getDomainStatusIcon(domain.attributes.ssl_status);

          return (
            <List.Item
              key={domain.id}
              icon={{ source: hostnameIcon.icon, tintColor: hostnameIcon.color }}
              title={domain.attributes.name}
              subtitle={domain.attributes.type}
              accessories={[
                { tag: { value: `DNS: ${domain.attributes.hostname_status}`, color: hostnameIcon.color } },
                { tag: { value: `SSL: ${domain.attributes.ssl_status}`, color: sslIcon.color } },
                { text: timeAgo(domain.attributes.created_at) },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Verify Domain" icon={Icon.CheckCircle} onAction={() => handleVerify(domain)} />
                  <Action
                    title="Delete Domain"
                    icon={Icon.Trash}
                    onAction={() => handleDelete(domain)}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Domain Name"
                    content={domain.attributes.name}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function AddDomainForm({ environmentId, onDomainAdded }: { environmentId: string; onDomainAdded: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string }) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Adding domain..." });
      await createDomain(environmentId, { name: values.name });
      await showToast({ style: Toast.Style.Success, title: "Domain added" });
      onDomainAdded();
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to add domain", message: String(error) });
    }
  }

  return (
    <Form
      navigationTitle="Add Domain"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Domain" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Domain Name" placeholder="example.com" />
    </Form>
  );
}
