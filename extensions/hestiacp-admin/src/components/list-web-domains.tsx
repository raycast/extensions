import { Action, ActionPanel, Color, Detail, Form, Icon, List, showToast, useNavigation } from "@raycast/api";
import { FormValidation, getFavicon, useForm } from "@raycast/utils";
import {
  getUserIPs,
  getWebDomainAccesslog,
  getWebDomainErrorlog,
  getWebDomainSSL,
  getWebDomains,
} from "../utils/hestia";
import ListItemDetailComponent from "./ListItemDetailComponent";
import useHestia from "../utils/hooks/useHestia";
import { AddWebDomainFormValues } from "../types/web-domains";
import { useState } from "react";

type ListWebDomainsComponentProps = {
  user: string;
};
export default function ListWebDomainsComponent({ user }: ListWebDomainsComponentProps) {
  const { isLoading, data: domains, revalidate } = getWebDomains(user);

  return (
    <List isLoading={isLoading} isShowingDetail navigationTitle={`Users / ${user} / Web Domains`}>
      {domains &&
        Object.entries(domains).map(([domain, data]) => (
          <List.Item
            key={domain}
            title={domain}
            icon={getFavicon(`https://${domain}`, { fallback: Icon.Globe })}
            detail={<ListItemDetailComponent data={data} />}
            accessories={[
              { icon: { source: Icon.Dot, tintColor: data.SUSPENDED === "yes" ? Color.Red : Color.Green } },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy to Clipboard as JSON"
                  icon={Icon.Clipboard}
                  content={JSON.stringify(data)}
                />
                <ActionPanel.Section>
                  <ActionPanel.Submenu title="View Logs" icon={Icon.ArrowRight}>
                    <Action.Push
                      title="View Access Log"
                      icon={Icon.Eye}
                      target={<ViewDomainAccessLog user={user} domain={domain} />}
                    />
                    <Action.Push
                      title="View Error Log"
                      icon={Icon.ExclamationMark}
                      target={<ViewDomainErrorLog user={user} domain={domain} />}
                    />
                  </ActionPanel.Submenu>
                  <Action.Push
                    // eslint-disable-next-line @raycast/prefer-title-case
                    title="View Domain SSL"
                    icon={Icon.Lock}
                    target={<ViewDomainSSL user={user} domain={domain} />}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Add Web Domain"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Add Web Domain"
                  target={<AddWebDomain user={user} onWebDomainAdded={revalidate} />}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

type ViewDomainAccessLogProps = {
  user: string;
  domain: string;
};
export function ViewDomainAccessLog({ user, domain }: ViewDomainAccessLogProps) {
  const { isLoading, data: accesslog } = getWebDomainAccesslog(user, domain);

  const markdown = !accesslog ? "" : accesslog.join(`\n\n`);

  return (
    <Detail
      navigationTitle={`Users / ${user} / Web Domains / ${domain}`}
      isLoading={isLoading}
      markdown={`# Access Log \n\n` + markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy to Clipboard" icon={Icon.Clipboard} content={JSON.stringify(accesslog)} />
        </ActionPanel>
      }
    />
  );
}

type ViewDomainErrorLogProps = {
  user: string;
  domain: string;
};
export function ViewDomainErrorLog({ user, domain }: ViewDomainErrorLogProps) {
  const { isLoading, data: errorlog } = getWebDomainErrorlog(user, domain);

  const markdown = !errorlog ? "" : errorlog.join(`\n\n`);

  return (
    <Detail
      navigationTitle={`Users / ${user} / Web Domains / ${domain}`}
      isLoading={isLoading}
      markdown={`# Error Log \n\n` + markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy to Clipboard" icon={Icon.Clipboard} content={JSON.stringify(errorlog)} />
        </ActionPanel>
      }
    />
  );
}

type ViewDomainSSLProps = {
  user: string;
  domain: string;
};
export function ViewDomainSSL({ user, domain }: ViewDomainSSLProps) {
  const { isLoading, data: ssl } = getWebDomainSSL(user, domain);

  const markdown = !ssl
    ? ""
    : `${ssl[domain].CRT}

SSL Private Key

${ssl[domain].KEY}

SSL Certificate Authority / Intermediate (Optional)

${ssl[domain].CA}`;

  return (
    <Detail
      navigationTitle={`Users / ${user} / Web Domains / ${domain}`}
      isLoading={isLoading}
      markdown={`# SSL Certificate \n\n` + markdown}
      metadata={
        ssl && (
          <Detail.Metadata>
            <Detail.Metadata.Label
              title="Enable automatic HTTPS redirection"
              icon={ssl[domain].SSL_FORCE === "yes" ? Icon.Check : Icon.Multiply}
            />
            <Detail.Metadata.Label title="Issued To" text={ssl[domain].SUBJECT} />
            <Detail.Metadata.Label title="Alternate" text={ssl[domain].ALIASES} />
            <Detail.Metadata.Label title="Not Before" text={ssl[domain].NOT_BEFORE} />
            <Detail.Metadata.Label title="Not After" text={ssl[domain].NOT_AFTER} />
            <Detail.Metadata.Label title="Signature" text={ssl[domain].SIGNATURE} />
            <Detail.Metadata.Label title="Key Size" text={ssl[domain].PUB_KEY} />
            <Detail.Metadata.Label title="Issued By" text={ssl[domain].ISSUER} />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Certificate & Keys" content={markdown} icon={Icon.Clipboard} />
          <Action.CopyToClipboard
            title="Copy All to Clipboard as JSON"
            content={JSON.stringify(ssl)}
            icon={Icon.CopyClipboard}
          />
        </ActionPanel>
      }
    />
  );
}

type AddWebDomainProps = {
  user: string;
  onWebDomainAdded: () => void;
};
function AddWebDomain({ user, onWebDomainAdded }: AddWebDomainProps) {
  const { pop } = useNavigation();
  const { isLoading: isFetching, data: IPs } = getUserIPs(user);
  const [execute, setExecute] = useState(false);

  const { handleSubmit, itemProps, values } = useForm<AddWebDomainFormValues>({
    onSubmit() {
      setExecute(true);
    },
    validation: {
      domain: FormValidation.Required,
      ip: FormValidation.Required,
    },
  });

  const { isLoading: isAdding } = useHestia<Record<string, never>>("v-add-web-domain", "Adding Web Domain", {
    body: [user, values.domain, values.ip],
    execute,
    async onData() {
      await showToast({
        title: "SUCCESS",
        message: `Added ${values.domain}`,
      });
      onWebDomainAdded();
      pop();
    },
    onError() {
      setExecute(false);
    },
  });
  const isLoading = isFetching || isAdding;

  return (
    <Form
      navigationTitle="Add Web Domain"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Domain" placeholder="domain.example" {...itemProps.domain} />
      <Form.Dropdown title="IP Address" {...itemProps.ip}>
        {IPs && Object.keys(IPs).map((ip) => <Form.Dropdown.Item key={ip} title={ip} value={ip} />)}
      </Form.Dropdown>
    </Form>
  );
}
