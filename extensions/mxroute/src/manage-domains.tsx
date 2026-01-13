import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  Keyboard,
  List,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, getFavicon, useCachedPromise, useForm } from "@raycast/utils";
import { mxroute } from "./mxroute";
import EmailAccounts from "./email-accounts";
import EmailForwarders from "./email-forwarders";
import Advanced from "./advanced";
import DNSInfo from "./dns-info";

export default function ManageDomains() {
  const {
    isLoading,
    data: domains,
    mutate,
  } = useCachedPromise(
    async () => {
      const domains = await mxroute.domains.list();
      const details = await Promise.all(domains.map((domain) => mxroute.domains.get(domain)));
      return details;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      {domains.map((domain) => (
        <List.Item
          key={domain.domain}
          title={domain.domain}
          icon={getFavicon(`https://${domain.domain}`, { fallback: Icon.Globe })}
          accessories={[
            { icon: Icon[`Number${String(domain.pointers.length).padStart(2, "0")}` as keyof typeof Icon] },
            { tag: { value: "Mail", color: domain.mail_hosting ? Color.Green : Color.Red } },
            { tag: { value: "SSL", color: domain.ssl_enabled ? Color.Green : Color.Red } },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Envelope}
                title="Email Accounts"
                target={<EmailAccounts selectedDomainName={domain.domain} domains={domains} />}
              />
              <Action.Push
                icon={Icon.Forward}
                title="Email Forwarders"
                target={<EmailForwarders selectedDomainName={domain.domain} domains={domains} />}
              />
              <Action.Push icon={Icon.Gear} title="Advanced" target={<Advanced selectedDomainName={domain.domain} />} />
              <Action.Push
                icon={Icon.Plus}
                title="Add New Domain"
                target={<AddDomain firstDomainName={domains[0].domain} />}
                onPop={mutate}
                shortcut={Keyboard.Shortcut.Common.New}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function AddDomain({ firstDomainName }: { firstDomainName: string }) {
  const { pop, push } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ domain: string }>({
    async onSubmit(values) {
      const { domain } = values;
      const toast = await showToast(Toast.Style.Animated, "Adding", domain);
      try {
        await mxroute.domains.create(domain);
        toast.style = Toast.Style.Success;
        toast.title = "Added";
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = `${error}`;
        toast.primaryAction = {
          title: "Open DNS Panel",
          onAction() {
            open("https://panel.mxroute.com/dns.php");
          },
        };
        toast.secondaryAction = {
          title: "View DNS Configuration",
          onAction() {
            push(<DNSInfo domain={firstDomainName} />);
          },
        };
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
          <Action.SubmitForm icon={Icon.Plus} title="Add Domain" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Domain Name"
        placeholder="example.com"
        info="Enter the domain without www (e.g., example.com)"
        {...itemProps.domain}
      />
    </Form>
  );
}
