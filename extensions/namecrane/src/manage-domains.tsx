import { FormValidation, getFavicon, useCachedPromise, useForm } from "@raycast/utils";
import { namecrane } from "./namecrane";
import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import ManageDNSRecords from "./views/manage-dns-records";

export default function ManageDomains() {
  const { isLoading, data: domains } = useCachedPromise(namecrane.domains.list, [], { initialData: [] });

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search domains">
      {!isLoading && !domains.length ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="No domains found."
          description="Domains you register or transfer in show up here."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Register a Domain" url="https://namecrane.com/domains/search" />
            </ActionPanel>
          }
        />
      ) : (
        domains.map((domain) => (
          <List.Item
            key={domain.domain}
            icon={getFavicon(`https://${domain.domain}`)}
            title={domain.domain}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Text}
                  title="Manage DNS Records"
                  target={<ManageDNSRecords domain={domain.domain} />}
                />
                <Action.Push
                  icon={Icon.List}
                  title="Manage Nameservers"
                  target={<ManageNameservers domain={domain.domain} />}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function ManageNameservers({ domain }: { domain: string }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps, setValue } = useForm<{ nameservers: string }>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Updating");
      try {
        await namecrane.domains.nameservers.set(domain, values.nameservers.split("\n"));
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
      nameservers: FormValidation.Required,
    },
  });

  const { isLoading } = useCachedPromise(
    async (domain: string) => {
      const result = await namecrane.domains.nameservers.get(domain);
      setValue("nameservers", result.nameservers.join("\n"));
    },
    [domain],
  );

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Update" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Nameservers" placeholder="ns1.example.com" {...itemProps.nameservers} />
    </Form>
  );
}
