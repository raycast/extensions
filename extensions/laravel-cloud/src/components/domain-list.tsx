import {
  ActionPanel,
  Action,
  List,
  Icon,
  Alert,
  confirmAlert,
  showToast,
  Toast,
  Form,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listDomains, createDomain, deleteDomain, verifyDomain } from "../api/domains";
import { Domain } from "../types/domain";
import { getDomainStatusIcon } from "../utils/status-icons";
import { timeAgo } from "../utils/dates";

interface Props {
  environmentId: string;
  environmentName: string;
}

export default function DomainList({ environmentId, environmentName }: Props) {
  const { data, isLoading, revalidate } = useCachedPromise((envId: string) => listDomains(envId), [environmentId]);

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
    <List isLoading={isLoading} navigationTitle={`${environmentName} — Domains`}>
      <List.Section title="Domains">
        {data?.data.map((domain) => (
          <DomainListItem
            key={domain.id}
            domain={domain}
            onDelete={() => handleDelete(domain)}
            onVerify={() => handleVerify(domain)}
          />
        ))}
      </List.Section>
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
    </List>
  );
}

function DomainListItem({
  domain,
  onDelete,
  onVerify,
}: {
  domain: Domain;
  onDelete: () => void;
  onVerify: () => void;
}) {
  const { attributes } = domain;
  const hostnameIcon = getDomainStatusIcon(attributes.hostname_status);
  const sslIcon = getDomainStatusIcon(attributes.ssl_status);

  return (
    <List.Item
      icon={{ source: hostnameIcon.icon, tintColor: hostnameIcon.color }}
      title={attributes.name}
      subtitle={attributes.type}
      accessories={[
        { tag: { value: `DNS: ${attributes.hostname_status}`, color: hostnameIcon.color } },
        { tag: { value: `SSL: ${attributes.ssl_status}`, color: sslIcon.color } },
        { text: timeAgo(attributes.created_at) },
      ]}
      actions={
        <ActionPanel>
          <Action title="Verify Domain" icon={Icon.CheckCircle} onAction={onVerify} />
          <Action
            title="Delete Domain"
            icon={Icon.Trash}
            onAction={onDelete}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
          />
          <Action.CopyToClipboard
            title="Copy Domain Name"
            content={attributes.name}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
        </ActionPanel>
      }
    />
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
