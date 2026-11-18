import * as email from "oci-email";
import { common, OCIProvider, useProvider } from "./oci";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { onError } from "./utils";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import OpenInOCI from "./open-in-oci";

export default function Command(props: LaunchProps<{ arguments: Arguments.EmailDelivery }>) {
  return <OCIProvider>{props.arguments.view === "email-domains" ? <EmailDomains /> : <ApprovedSenders />}</OCIProvider>;
}

function getEmailDomainColor(state: email.models.EmailDomainSummary["lifecycleState"]) {
  switch (state) {
    case email.models.EmailDomain.LifecycleState.Active:
      return Color.Green;
    case email.models.EmailDomain.LifecycleState.Creating:
    case email.models.EmailDomain.LifecycleState.Deleting:
      return Color.Orange;
    default:
      return undefined;
  }
}
function EmailDomains() {
  const { provider } = useProvider();
  const {
    isLoading,
    data: domains,
    mutate,
  } = useCachedPromise(
    async () => {
      const emailClient = new email.EmailClient({ authenticationDetailsProvider: provider });
      const domains = await emailClient.listEmailDomains({ compartmentId: provider.getTenantId() });
      return domains.emailDomainCollection.items;
    },
    [],
    { initialData: [], onError },
  );

  async function confirmAndDelete(domain: email.models.EmailDomainSummary) {
    const options: Alert.Options = {
      title: "Delete Email Domain",
      message: `Are you sure you want to remove email domain "${domain.name}"? Removing it will prevent you from sending emails from that domain. Any DKIM signing for emails sent through this region from this domain will also stop.`,
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
      },
    };

    if (!(await confirmAlert(options))) return;
    const toast = await showToast(Toast.Style.Animated, "Deleting", domain.name);
    try {
      const emailClient = new email.EmailClient({ authenticationDetailsProvider: provider });
      await mutate(
        emailClient.deleteEmailDomain({
          emailDomainId: domain.id,
        }),
        {
          optimisticUpdate(data) {
            return data.filter((e) => e.id !== domain.id);
          },
          shouldRevalidateAfter: false,
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Deleted";
    } catch (error) {
      onError(error);
    }
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && !domains.length ? (
        <List.EmptyView
          title="No email domains found."
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Create Email Domain"
                target={<CreateEmailDomain provider={provider} />}
                onPop={mutate}
              />
            </ActionPanel>
          }
        />
      ) : (
        domains.map((domain) => (
          <List.Item
            key={domain.id}
            icon={{
              value: { source: Icon.CircleFilled, tintColor: getEmailDomainColor(domain.lifecycleState) },
              tooltip: domain.lifecycleState || "",
            }}
            title={domain.name}
            accessories={[
              domain.activeDkimId
                ? { tag: { value: "DKIM Signing", color: Color.Green }, tooltip: "Active" }
                : { tag: { value: "DKIM Signing", color: Color.Orange }, tooltip: "Inactive" },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Plus}
                  title="Create Email Domain"
                  target={<CreateEmailDomain provider={provider} />}
                  onPop={mutate}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete"
                  onAction={() => confirmAndDelete(domain)}
                  style={Action.Style.Destructive}
                />
                <OpenInOCI route="email/email-domains" />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function CreateEmailDomain({ provider }: { provider: common.ConfigFileAuthenticationDetailsProvider }) {
  type FormValues = {
    name: string;
  };
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.name);
      try {
        const emailClient = new email.EmailClient({ authenticationDetailsProvider: provider });
        await emailClient.createEmailDomain({
          createEmailDomainDetails: {
            compartmentId: provider.getTenantId(),
            name: values.name,
          },
        });
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        pop();
      } catch (error) {
        onError(error);
      }
    },
    validation: {
      name: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Create Email Domain" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Email Domain Name" placeholder="Email Domain Name" {...itemProps.name} />
    </Form>
  );
}

function ApprovedSenders() {
  const { provider } = useProvider();
  const {
    isLoading,
    data: senders,
    mutate,
  } = useCachedPromise(
    async () => {
      const emailClient = new email.EmailClient({ authenticationDetailsProvider: provider });
      const senders = await emailClient.listSenders({ compartmentId: provider.getTenantId() });
      return senders.items;
    },
    [],
    { initialData: [], onError },
  );

  async function confirmAndDelete(sender: email.models.SenderSummary) {
    const options: Alert.Options = {
      title: "Delete Approved Sender",
      message: `Are you sure you want to remove approved sender "${sender.emailAddress}"?`,
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
      },
    };

    if (!(await confirmAlert(options))) return;
    const toast = await showToast(Toast.Style.Animated, "Deleting", sender.emailAddress);
    try {
      const emailClient = new email.EmailClient({ authenticationDetailsProvider: provider });
      await mutate(
        emailClient.deleteSender({
          senderId: sender.id,
        }),
        {
          optimisticUpdate(data) {
            return data.filter((s) => s.id !== sender.id);
          },
          shouldRevalidateAfter: false,
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = "Deleted";
    } catch (error) {
      onError(error);
    }
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && !senders.length ? (
        <List.EmptyView
          title=""
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.AddPerson}
                title="Create Approved Sender"
                target={<CreateApprovedSender provider={provider} />}
                onPop={mutate}
              />
            </ActionPanel>
          }
        />
      ) : (
        senders.map((sender) => (
          <List.Item
            key={sender.id}
            icon={Icon.Person}
            title={sender.emailAddress}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.AddPerson}
                  title="Create Approved Sender"
                  target={<CreateApprovedSender provider={provider} />}
                  onPop={mutate}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete"
                  onAction={() => confirmAndDelete(sender)}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                />
                <OpenInOCI route="messaging/email/senders" />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function CreateApprovedSender({ provider }: { provider: common.ConfigFileAuthenticationDetailsProvider }) {
  type FormValues = {
    emailAddress: string;
  };
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating", values.emailAddress);
      try {
        const emailClient = new email.EmailClient({ authenticationDetailsProvider: provider });
        await emailClient.createSender({
          createSenderDetails: {
            compartmentId: provider.getTenantId(),
            emailAddress: values.emailAddress,
          },
        });
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        pop();
      } catch (error) {
        onError(error);
      }
    },
    validation: {
      emailAddress: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.AddPerson} title="Create Approved Sender" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Email Address" placeholder="help@example.com" {...itemProps.emailAddress} />
    </Form>
  );
}
