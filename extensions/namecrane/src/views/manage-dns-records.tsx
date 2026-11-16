import {
  List,
  ActionPanel,
  Action,
  Icon,
  confirmAlert,
  Alert,
  showToast,
  Toast,
  useNavigation,
  Form,
} from "@raycast/api";
import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { namecrane } from "../namecrane";
import { Record } from "../types";

export default function ManageDNSRecords({ domain }: { domain: string }) {
  const { isLoading, data: records, mutate } = useCachedPromise(namecrane.dns.list, [domain], { initialData: [] });

  return (
    <List isLoading={isLoading} isShowingDetail>
      {!isLoading && !records.length ? (
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Create Record"
                target={<CreateDNSRecord domain={domain} />}
                onPop={mutate}
              />
            </ActionPanel>
          }
        />
      ) : (
        records.map((record) => (
          <List.Item
            key={record.id}
            title={record.name}
            accessories={[{ tag: record.type }]}
            detail={
              <List.Item.Detail
                markdown={record.content}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="TTL" text={record.ttl.toString()} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Trash}
                  title="Delete Record"
                  style={Action.Style.Destructive}
                  onAction={() =>
                    confirmAlert({
                      title: "Delete?",
                      primaryAction: {
                        style: Alert.ActionStyle.Destructive,
                        title: "Delete",
                        async onAction() {
                          const toast = await showToast(Toast.Style.Animated, "Deleting", record.id);
                          try {
                            await mutate(namecrane.dns.remove(domain, record.id), {
                              optimisticUpdate(data) {
                                return data?.filter((r) => r.id !== record.id);
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
                    })
                  }
                />
                <Action.Push
                  icon={Icon.Plus}
                  title="Create Record"
                  target={<CreateDNSRecord domain={domain} />}
                  onPop={mutate}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function CreateDNSRecord({ domain }: { domain: string }) {
  const { pop } = useNavigation();

  const { handleSubmit, itemProps } = useForm<Omit<Record, "id" | "display_name">>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Creating");
      try {
        await namecrane.dns.create(domain, values);
        toast.style = Toast.Style.Success;
        toast.title = "Created";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      type: FormValidation.Required,
      name: FormValidation.Required,
      content: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Check} title="Create" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Type" {...itemProps.type}>
        <Form.Dropdown.Item title="A" value="A" />
        <Form.Dropdown.Item title="AAAA" value="AAAA" />
        <Form.Dropdown.Item title="TXT" value="TXT" />
      </Form.Dropdown>
      <Form.TextField title="Name" placeholder="www" {...itemProps.name} />
      <Form.TextArea title="Content" {...itemProps.content} />
    </Form>
  );
}
