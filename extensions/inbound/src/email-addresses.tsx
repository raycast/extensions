import {
  List,
  Icon,
  ActionPanel,
  Action,
  useNavigation,
  showToast,
  Toast,
  Form,
  Keyboard,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useCachedPromise, useForm, FormValidation } from "@raycast/utils";
import { inbound } from "./inbound";
import { DomainWithStats, EmailAddressWithDomain, PostEmailAddressesRequest } from "./types";

export default function EmailAddresses({ domain }: { domain: DomainWithStats }) {
  const {
    isLoading,
    data: emailAddresses,
    mutate,
  } = useCachedPromise(
    async (domainId: string) => {
      const { data } = await inbound.email.address.list({ domainId });
      return data;
    },
    [domain.id],
    { initialData: [] },
  );

  const confirmAndDelete = async (emailAddress: EmailAddressWithDomain) => {
    const options: Alert.Options = {
      icon: Icon.Warning,
      title: "Delete Email Address",
      message: `Are you sure you want to delete "${emailAddress.address}"? This action cannot be undone.`,
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Delete",
      },
    };
    if (!(await confirmAlert(options))) return;
    const toast = await showToast(Toast.Style.Animated, "Deleting Email Address", emailAddress.address);
    try {
      await mutate(inbound.email.address.delete(emailAddress.id), {
        optimisticUpdate(data) {
          return data.filter((e) => e.id !== emailAddress.id);
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
      {!isLoading && !emailAddresses.length ? (
        <List.EmptyView
          icon={Icon.Envelope}
          title="No email addresses configured"
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.PlusCircle}
                title="Add Email Address"
                target={<AddEmailAddress domain={domain} />}
                onPop={mutate}
              />
            </ActionPanel>
          }
        />
      ) : (
        emailAddresses.map((emailAddress) => (
          <List.Item
            key={emailAddress.id}
            icon={Icon.AtSymbol}
            title={emailAddress.address.split("@")[0]}
            subtitle={`@${emailAddress.domain.name}`}
            accessories={[
              { text: emailAddress.routing.type === "none" ? "Store in Inbound" : emailAddress.routing.type },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={emailAddress.address} />
                <Action.Push
                  icon={Icon.PlusCircle}
                  title="Add Email Address"
                  target={<AddEmailAddress domain={domain} />}
                  onPop={mutate}
                />
                <Action
                  icon={Icon.Trash}
                  title="Delete Email Address"
                  onAction={() => confirmAndDelete(emailAddress)}
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
function AddEmailAddress({ domain }: { domain: DomainWithStats }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<PostEmailAddressesRequest>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding Email Address", values.address);
      try {
        await inbound.email.address.create({
          domainId: domain.id,
          address: `${values.address}@${domain.domain}`,
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
      address: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.PlusCircle} title="Add Email Address" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="username" {...itemProps.address} />
      <Form.Description text={`@${domain.domain}`} />
    </Form>
  );
}
