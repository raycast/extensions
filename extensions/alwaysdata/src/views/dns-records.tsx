import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { alwaysdata } from "../alwaysdata";
import { DNSRecordForm, DNSRecordType, Domain } from "../types";
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

export default function DNSRecords({ domain }: { domain: Domain }) {
  const {
    isLoading,
    data: records,
    mutate,
  } = useCachedPromise(() => alwaysdata.dnsRecords.list({ domainId: domain.id }), [], { initialData: [] });

  return (
    <List isLoading={isLoading} isShowingDetail>
      {records.map((record) => (
        <List.Item
          key={record.id}
          title={record.name}
          accessories={[{ tag: record.type }]}
          detail={<List.Item.Detail markdown={record.value} />}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Add DNS Record"
                target={<AddDNSRecord domain={domain} />}
                onPop={mutate}
              />
              <Action
                icon={Icon.Trash}
                title="Delete DNS Record"
                onAction={() => {
                  confirmAlert({
                    icon: { source: Icon.Trash, tintColor: Color.Red },
                    title: `Are you sure you want to delete the DNS record for the ${domain.name} domain?`,
                    primaryAction: {
                      style: Alert.ActionStyle.Destructive,
                      title: "Delete",
                      async onAction() {
                        const toast = await showToast(Toast.Style.Animated, "Deleting");
                        try {
                          await mutate(alwaysdata.dnsRecords.delete({ id: record.id }), {
                            optimisticUpdate(data) {
                              return data.filter((r) => r.id !== record.id);
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

function AddDNSRecord({ domain }: { domain: Domain }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<DNSRecordForm>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Adding");
      try {
        await alwaysdata.dnsRecords.add({ ...values, domain: domain.id });
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
      type: FormValidation.Required,
      value: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Add DNS Record" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        info="The hostname, without adding the domain at the end. Only composed of letters (a-z), numbers (0-9), hyphen (-), underscore (_), dot (.) or leave blank to designate the domain itself. Examples: www, webmail, admin."
        {...itemProps.name}
      />
      <Form.Description text={`.${domain.name}`} />
      <Form.Dropdown title="Type" {...itemProps.type}>
        {Object.values(DNSRecordType).map((type) => (
          <Form.Dropdown.Item key={type} title={type} value={type} />
        ))}
      </Form.Dropdown>
      <Form.TextField title="Value" {...itemProps.value} />
      <Form.Separator />
      <Form.TextField
        title="Annotation"
        info="The annotation is optional and will be displayed in the listing."
        {...itemProps.annotation}
      />
    </Form>
  );
}
