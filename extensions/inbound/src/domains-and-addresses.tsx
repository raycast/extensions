import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { inbound } from "./inbound";
import { DomainWithStats, PostDomainsRequest } from "./types";
import EmailAddresses from "./email-addresses";

export default function DomainsAndAddresses() {
  const {
    isLoading,
    data: domains,
    mutate,
  } = useCachedPromise(
    async () => {
      const { data } = await inbound.domain.list();
      return data;
    },
    [],
    {
      initialData: [],
    },
  );

  const confirmAndDelete = async (domain: DomainWithStats) => {
    const options: Alert.Options = {
      title: "Delete Domain",
      message: `This action cannot be undone. This will permanently delete the domain "${domain.domain}" and all associated email addresses and data.`,
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete Domain",
      },
    };
    if (!(await confirmAlert(options))) return;
    const toast = await showToast(Toast.Style.Animated, "Deleting Domain", domain.domain);
    try {
      await mutate(inbound.domain.delete(domain.id), {
        optimisticUpdate(data) {
          return data.filter((d) => d.id !== domain.id);
        },
        shouldRevalidateAfter: false,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Deleted";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = `${error}`;
    }
  };

  return (
    <List isLoading={isLoading}>
      {!isLoading && !domains.length ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="No domains found"
          description="Start by adding a domain to create email addresses."
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.PlusCircle} title="Add Your First Domain" target={<AddDomain />} onPop={mutate} />
            </ActionPanel>
          }
        />
      ) : (
        domains.map((domain) => (
          <List.Item
            key={domain.id}
            icon={{ source: Icon.Dot, tintColor: domain.status === "verified" ? Color.Green : Color.Red }}
            title={domain.domain}
            subtitle={`API ID: ${domain.id}`}
            accessories={[
              {
                tag:
                  domain.status === "verified"
                    ? { value: "Active", color: Color.Blue }
                    : { value: "Inactive", color: Color.Red },
              },
              {
                text: new Date(domain.updatedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }),
              },
              {
                icon: Icon.Envelope,
                text: `${domain.stats.totalEmailAddresses} email${domain.stats.totalEmailAddresses === 1 ? "" : "s"}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Envelope}
                  title="View Email Addresses"
                  target={<EmailAddresses domain={domain} />}
                />
                <Action.Push icon={Icon.Text} title="View DNS Records" target={<DNSRecords domain={domain} />} />
                <Action.Push
                  icon={Icon.PlusCircle}
                  title="Add Domain"
                  target={<AddDomain />}
                  onPop={mutate}
                  shortcut={Keyboard.Shortcut.Common.New}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Domain"
                  onAction={() => confirmAndDelete(domain)}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  style={Action.Style.Destructive}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function AddDomain() {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<PostDomainsRequest>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding Domain", values.domain);
      try {
        await inbound.domain.create({
          domain: values.domain,
        });
        toast.style = Toast.Style.Success;
        toast.title = "Added";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      domain: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.PlusCircle} title="Add Domain" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="example.com" {...itemProps.domain} />
    </Form>
  );
}

function DNSRecords({ domain }: { domain: DomainWithStats }) {
  const { isLoading, data: records } = useCachedPromise(
    async (domainId: string) => {
      const { records } = await inbound.domain.getDnsRecords(domainId);
      return records;
    },
    [domain.id],
    { initialData: [] },
  );
  return (
    <List isLoading={isLoading}>
      {!isLoading && !records.length ? (
        <List.EmptyView title="No DNS records available yet." />
      ) : (
        records.map((record) => (
          <List.Item
            key={record.id}
            title={record.name === domain.domain ? "@" : record.name.replace(`.${domain.domain}`, "")}
            subtitle={record.value}
            accessories={[{ tag: record.recordType }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://inbound.new/emails/${domain.id}`} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
