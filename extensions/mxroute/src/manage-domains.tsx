import {
  Action,
  ActionPanel,
  Color,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, getFavicon, useCachedPromise, useCachedState, useForm, usePromise } from "@raycast/utils";
import { mxroute } from "./mxroute";
import EmailAccounts from "./email-accounts";
import EmailForwarders from "./email-forwarders";
import Advanced from "./advanced";
import DNSInfo from "./dns-info";
import { Domain, DomainVerificationKey } from "./types";

const { server } = getPreferenceValues<Preferences>();

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

  const toggleMailHostingStatus = async (domain: Domain) => {
    const toast = await showToast(Toast.Style.Animated, "Toggling");
    try {
      const enabled = !domain.mail_hosting;
      await mutate(mxroute.domains.setMailHostingStatus(domain.domain, { enabled }), {
        optimisticUpdate(data) {
          return data.map((d) => (d.domain === domain.domain ? { ...d, mail_hosting: enabled } : d));
        },
        shouldRevalidateAfter: false,
      });
      toast.style = Toast.Style.Success;
      toast.title = "Toggled";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = `${error}`;
    }
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter domains">
      {domains.map((domain) => (
        <List.Item
          key={domain.domain}
          title={domain.domain}
          icon={getFavicon(`https://${domain.domain}`, { fallback: Icon.Globe })}
          accessories={[
            { tag: { value: !domain.mail_hosting ? "EXTERNAL MAIL" : undefined, color: Color.Yellow } },
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
              <Action.Push icon={Icon.Monitor} title="DNS" target={<DNSInfo domain={domain.domain} />} />
              <ActionPanel.Submenu icon={Icon.Info} title="Set Mail Hosting Status">
                <Action
                  icon={domain.mail_hosting ? Icon.CheckCircle : Icon.Circle}
                  title="Host Mail on This Server"
                  onAction={() => toggleMailHostingStatus(domain)}
                />
                <Action
                  icon={!domain.mail_hosting ? Icon.CheckCircle : Icon.Circle}
                  title="Mail Hosted Elsewhere"
                  onAction={() => toggleMailHostingStatus(domain)}
                />
              </ActionPanel.Submenu>
              <ActionPanel.Submenu icon={Icon.Window} title="Email Clients">
                <Action.OpenInBrowser title="Webmail (No DNS Required)" url={`https://${server}/webmail`} />
              </ActionPanel.Submenu>
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
  const [data, setData] = useCachedState<DomainVerificationKey>("domain-verification-key");
  const { isLoading } = usePromise(mxroute.getDomainVerificationKey, [], {
    onData: setData,
    execute: !data,
  });
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
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Add Domain" onSubmit={handleSubmit} />
          {data && (
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy Name to Clipboard"
                content={data.record.name}
                shortcut={Keyboard.Shortcut.Common.CopyName}
              />
              <Action.CopyToClipboard
                title="Copy Value to Clipboard"
                content={data.record.value}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Domain Name"
        placeholder="example.com"
        info="Enter the domain without www (e.g., example.com)"
        {...itemProps.domain}
      />
      <Form.Separator />
      {data && (
        <>
          <Form.Description text={data.description} />
          <Form.Description title="Type" text={data.record.type} />
          <Form.Description title="Name" text={data.record.name} />
          <Form.Description title="Value" text={data.record.value} />
        </>
      )}
    </Form>
  );
}
