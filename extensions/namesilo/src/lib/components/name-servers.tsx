import { List, ActionPanel, Action, Icon, useNavigation, showToast, Toast, Form } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import useNameSilo from "../hooks/useNameSilo";
import { ArrOrObjOrNull, NameServer, EmptySuccessResponse, type AddNameServer, type ChangeNameServer } from "../types";
import { parseAsArray } from "../utils/parseAsArray";

export default function NameServers({ domain }: { domain: string }) {
  type NameServersResponse = { hosts?: ArrOrObjOrNull<NameServer> };
  const { isLoading, data, revalidate } = useNameSilo<NameServersResponse>("listRegisteredNameServers", {
    domain,
  });
  const parsed = parseAsArray(data?.hosts);
  // an edge case is the return being string[] so this is a dirty way to get usable object
  // this seems to happen when NameSilo can't parse the host properly
  const isStringArray = !JSON.stringify(parsed).includes(`"host":`);
  const nameServers = isStringArray ? mapAsNSObj(parsed as unknown as string[]) : parsed;
  function mapAsNSObj(data: string[]) {
    const obj: NameServer = { host: "", ip: data[0] };
    data.slice(1).forEach((ip, idx) => (obj[`ip${idx + 1}` as keyof typeof obj] = ip));
    return [obj];
  }

  const hasNone = !isLoading && !nameServers.length;
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search registered nameserver" isShowingDetail={!hasNone}>
      {hasNone ? (
        <List.EmptyView
          title="No reigstered name server in your domain"
          description="Add name servers to get started"
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Add NameServer"
                target={<AddNameServer domain={domain} onAdded={revalidate} />}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`Domains / ${domain} / NameServers`}>
          {nameServers.map((nameServer) => {
            const { host, ...ips } = nameServer;
            return (
              <List.Item
                key={host}
                icon={Icon.List}
                title={host}
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        {Object.entries(ips).map(([title, text]) => (
                          <List.Item.Detail.Metadata.Label key={title} title={title} text={text} />
                        ))}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.Push
                      icon={Icon.Plus}
                      title="Add NameServer"
                      target={<AddNameServer domain={domain} onAdded={revalidate} />}
                    />
                    <Action.Push
                      icon={Icon.Torch}
                      title="Change NameServers"
                      target={<ChangeNameServer domain={domain} onChanged={revalidate} />}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

function AddNameServer({ domain, onAdded }: { domain: string; onAdded: () => void }) {
  const { pop } = useNavigation();
  const [execute, setExecute] = useState(false);
  const { itemProps, handleSubmit, values } = useForm<AddNameServer>({
    onSubmit() {
      setExecute(true);
    },
    validation: {
      new_host: FormValidation.Required,
      ip1: FormValidation.Required,
    },
  });

  const { isLoading } = useNameSilo<EmptySuccessResponse>(
    "addRegisteredNameServer",
    {
      domain,
      ...Object.fromEntries(Object.entries(values).filter(([, val]) => val)),
    },
    {
      execute,
      async onData() {
        await showToast(Toast.Style.Success, "Added Name Server", values.new_host);
        onAdded();
        pop();
      },
      onError() {
        setExecute(false);
      },
    },
  );

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Add NameServer" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Domains / ${domain} / NameServers / Add`} />
      <Form.TextField title="Host" placeholder="ns1.example.com" {...itemProps.new_host} />
      <Form.TextField title="IP" placeholder="8.8.8.8" {...itemProps.ip1} />
      <Form.Separator />
      <Form.Description text="Additional IPs (OPTIONAL)" />
      <Form.TextField title="IP 2" placeholder="8.8.4.4" {...itemProps.ip2} />
      <Form.TextField title="IP 3" placeholder="8.8.4.4" {...itemProps.ip3} />
      <Form.TextField title="IP 4" placeholder="8.8.4.4" {...itemProps.ip4} />
      <Form.TextField title="IP 5" placeholder="8.8.4.4" {...itemProps.ip5} />
      <Form.TextField title="IP 6" placeholder="8.8.4.4" {...itemProps.ip6} />
      <Form.TextField title="IP 7" placeholder="8.8.4.4" {...itemProps.ip7} />
      <Form.TextField title="IP 8" placeholder="8.8.4.4" {...itemProps.ip8} />
      <Form.TextField title="IP 9" placeholder="8.8.4.4" {...itemProps.ip9} />
      <Form.TextField title="IP 10" placeholder="8.8.4.4" {...itemProps.ip10} />
      <Form.TextField title="IP 11" placeholder="8.8.4.4" {...itemProps.ip11} />
      <Form.TextField title="IP 12" placeholder="8.8.4.4" {...itemProps.ip12} />
      <Form.TextField title="IP 13" placeholder="8.8.4.4" {...itemProps.ip13} />
    </Form>
  );
}

function ChangeNameServer({ domain, onChanged }: { domain: string; onChanged: () => void }) {
  const { pop } = useNavigation();
  const [execute, setExecute] = useState(false);
  const { itemProps, handleSubmit, values } = useForm<ChangeNameServer>({
    onSubmit() {
      setExecute(true);
    },
    validation: {
      ns1: FormValidation.Required,
      ns2: FormValidation.Required,
    },
  });

  const { isLoading } = useNameSilo<EmptySuccessResponse>(
    "changeNameServers",
    {
      domain,
      ...Object.fromEntries(Object.entries(values).filter(([, val]) => val)),
    },
    {
      execute,
      async onData() {
        await showToast(Toast.Style.Success, "Changed Name Servers", domain);
        onChanged();
        pop();
      },
      onError() {
        setExecute(false);
      },
    },
  );

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm icon={Icon.Plus} title="Change Name Servers" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`Domains / ${domain} / NameServers / Change`} />
      <Form.TextField title="NameServer 1" placeholder="ns1.example.com" {...itemProps.ns1} />
      <Form.TextField title="NameServer 2" placeholder="ns2.example.com" {...itemProps.ns2} />
      <Form.Separator />
      <Form.Description text="Additional Name Servers (OPTIONAL)" />
      <Form.TextField title="Name Server 3" placeholder="ns3.example.com" {...itemProps.ns3} />
      <Form.TextField title="Name Server 4" placeholder="ns4.example.com" {...itemProps.ns4} />
      <Form.TextField title="Name Server 5" placeholder="ns5.example.com" {...itemProps.ns5} />
      <Form.TextField title="Name Server 6" placeholder="ns6.example.com" {...itemProps.ns6} />
      <Form.TextField title="Name Server 7" placeholder="ns7.example.com" {...itemProps.ns7} />
      <Form.TextField title="Name Server 8" placeholder="ns8.example.com" {...itemProps.ns8} />
      <Form.TextField title="Name Server 9" placeholder="ns9.example.com" {...itemProps.ns9} />
      <Form.TextField title="Name Server 10" placeholder="ns10.example.com" {...itemProps.ns10} />
      <Form.TextField title="Name Server 11" placeholder="ns11.example.com" {...itemProps.ns11} />
      <Form.TextField title="Name Server 12" placeholder="ns12.example.com" {...itemProps.ns12} />
      <Form.TextField title="Name Server 13" placeholder="ns13.example.com" {...itemProps.ns13} />
    </Form>
  );
}
