import { FormValidation, useCachedPromise, useForm } from "@raycast/utils";
import { listDomains, updateDomainNameServers } from "./nicnames";
import { Action, ActionPanel, Color, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";

export default function Domains() {
  const {
    isLoading,
    data: domains,
    revalidate,
  } = useCachedPromise(
    async () => {
      const result = await listDomains();
      return result.list;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading} isShowingDetail>
      {domains.map((domainItem) => (
        <List.Item
          key={domainItem.oid}
          icon={
            domainItem.status.includes("active")
              ? { value: { source: Icon.EllipsisVertical, tintColor: Color.Green }, tooltip: "Active" }
              : { value: { source: Icon.EllipsisVertical, tintColor: Color.Red }, tooltip: "Inactive" }
          }
          title={domainItem.domain.name}
          detail={
            <List.Item.Detail
              markdown={`
| NS |
|----|
${domainItem.domain.ns.map((ns) => `| ${ns} |`).join("\n")}
    `}
            />
          }
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.List}
                title="Update Name Servers"
                target={<UpdateNameServers domain={domainItem.domain.name} />}
                onPop={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function UpdateNameServers({ domain }: { domain: string }) {
  const { pop } = useNavigation();
  type FormValues = {
    type: string;
    ns1: string;
    ns2: string;
  };
  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Updating");
      try {
        await updateDomainNameServers(domain, [values.ns1, values.ns2]);
        toast.style = Toast.Style.Success;
        toast.title = "Updated";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
      }
    },
    validation: {
      ns1: FormValidation.Required,
      ns2: FormValidation.Required,
    },
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.SaveDocument} title="Save Name Servers" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Custom Name-Servers" />
      <Form.TextField title="Name-Server 1" placeholder="ns1.example.com" {...itemProps.ns1} />
      <Form.TextField title="Name-Server 2" placeholder="ns2.example.com" {...itemProps.ns2} />
    </Form>
  );
}
