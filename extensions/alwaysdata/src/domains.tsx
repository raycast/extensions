import {
  List,
  ActionPanel,
  Action,
  Icon,
  confirmAlert,
  Color,
  Alert,
  showToast,
  Toast,
  Keyboard,
  useNavigation,
  Form,
} from "@raycast/api";
import { useCachedPromise, getFavicon, useForm, FormValidation } from "@raycast/utils";
import { alwaysdata } from "./alwaysdata";
import DNSRecords from "./views/dns-records";
import OpenInAlwaysdata from "./components/open-in-alwaysdata";

export default function Domains() {
  const {
    isLoading,
    data: domains,
    mutate,
  } = useCachedPromise(alwaysdata.domains.list, [], {
    initialData: [],
  });

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        title="No domain name"
        actions={
          <ActionPanel>
            <Action.Push icon={Icon.Plus} title="Add Domain" target={<AddDomain />} onPop={mutate} />
          </ActionPanel>
        }
      />
      {domains.map((domain) => (
        <List.Item
          key={domain.id}
          icon={getFavicon(domain.name, { fallback: Icon.Globe })}
          title={domain.name}
          accessories={[
            domain.date_expiration
              ? { date: new Date(domain.date_expiration) }
              : { text: "N/A (external domain name)" },
          ]}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.List} title="DNS Records" target={<DNSRecords domain={domain} />} />
              <OpenInAlwaysdata path={`domain/${domain.id}`} />
              <Action.Push icon={Icon.Plus} title="Add Domain" target={<AddDomain />} onPop={mutate} />
              <Action
                icon={Icon.Trash}
                title="Delete Domain"
                onAction={() => {
                  confirmAlert({
                    icon: { source: Icon.Trash, tintColor: Color.Red },
                    title: `Are you sure you want to delete the domain ${domain.name}?`,
                    message: "This will also delete all the domain's mailboxes and their contents.",
                    primaryAction: {
                      style: Alert.ActionStyle.Destructive,
                      title: "Delete",
                      async onAction() {
                        const toast = await showToast(Toast.Style.Animated, "Deleting", domain.name);
                        try {
                          await mutate(alwaysdata.domains.delete({ id: domain.id }), {
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
                      },
                    },
                  });
                }}
                shortcut={Keyboard.Shortcut.Common.Remove}
                style={Action.Style.Destructive}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function AddDomain() {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding", values.name);
      try {
        await alwaysdata.domains.add(values);
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
      name: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Add Domain" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Domain" placeholder="example.com" {...itemProps.name} />
    </Form>
  );
}
