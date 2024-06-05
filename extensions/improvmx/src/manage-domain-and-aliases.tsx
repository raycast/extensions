import {
  showToast,
  Toast,
  List,
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  launchCommand,
  LaunchType,
  useNavigation,
} from "@raycast/api";

import { useState } from "react";
import { domainIcon, useImprovMX } from "./utils";
import { Alias, Domain, DomainLog } from "./types";
import { showFailureToast } from "@raycast/utils";
import ErrorComponent from "./components/ErrorComponent";
import { useImprovMXPaginated } from "./hooks/useImprovMXPaginated";

export default function ManageDomainsAndAliases() {
  const { isLoading, error, data: domains, pagination } = useImprovMXPaginated<Domain, "domains">("domains");
  
  const { push } = useNavigation();
  const showAliases = async (domain: Domain) => {
    if (domain.banned || !domain.active) {
      showFailureToast("", { title: "Domain not configured properly. Please configure your DNS settings" })
      return;
    }
    push(<ViewAliases domain={domain.display} />);
  };

  return error ? (
    <ErrorComponent error={error} />
  ) : (
    <List isLoading={isLoading} searchBarPlaceholder="Search for domain..." pagination={pagination}>
      <List.Section title="Active Domains">
        {domains
          .filter((domain) => domain.active)
          .map((domain: Domain) => (
            <List.Item
              key={domain.display}
              title={domain.display}
              icon={domainIcon(domain)}
              accessories={[{ text: { value: domain.aliases.length.toString() + " aliases" } }]}
              actions={
                <ActionPanel>
                  <Action title="Show Aliases" onAction={() => showAliases(domain)} />
                  <Action.Push title="View Domain Logs" target={<ViewDomainLogs domain={domain.display} />} />
                </ActionPanel>
              }
            />
          ))}
        {domains && (
          <List.Item
            title="Add New Domain"
            icon={{ source: Icon.Plus }}
            actions={
              <ActionPanel>
                <Action
                  title="Add New Domain"
                  onAction={async () => {
                    await launchCommand({ name: "add-domain", type: LaunchType.UserInitiated });
                  }}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Section title="Inactive Domains">
        {domains
          ?.filter((domain) => !domain.active)
          .map((domain: Domain) => (
            <List.Item
              key={domain.display}
              title={domain.display}
              icon={domainIcon(domain)}
              accessories={[{ text: { value: domain.aliases.length.toString() + " aliases" } }]}
              actions={
                <ActionPanel>
                  <Action title="Show Aliases" onAction={() => showAliases(domain)} />
                  <Action.Push title="View Domain Logs" target={<ViewDomainLogs domain={domain.display} />} />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  )
}

type ViewAliasesProps = {
  domain: string;
}
function ViewAliases({ domain }: ViewAliasesProps) {
  const { isLoading, data: aliases, error, pagination } = useImprovMXPaginated<Alias, "aliases">(`domains/${domain}/aliases`);

  return error ? <ErrorComponent error={error} /> : (
    <List isLoading={isLoading} searchBarPlaceholder="Search for alias..." pagination={pagination}>
      <List.Section title={`${domain} Aliases`}>
        {aliases.map((alias) => (
          <List.Item
            key={alias.alias}
            title={alias.alias + "@" + domain}
            subtitle={`-> ${alias.forward}`}
            accessories={[
        { date: new Date(alias.created) }
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy Alias"
                  onAction={async () => {
                    await Clipboard.copy(alias.alias + "@" + domain);
                    await showToast(Toast.Style.Success, "Copied", "Alias copied to clipboard");
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
        {!isLoading && (
          <>
            <List.Item
              title="Create New Alias"
              icon={{ source: Icon.Plus }}
              actions={
                <ActionPanel>
                  <Action
                    title="Create New Alias"
                    onAction={async () => {
                      await launchCommand({
                        name: "create-alias",
                        type: LaunchType.UserInitiated,
                        arguments: {
                          domain,
                        },
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title="Create Masked Email Address"
              icon={{ source: Icon.Plus }}
              actions={
                <ActionPanel>
                  <Action
                    title="Create Masked Email Address"
                    onAction={async () => {
                      await launchCommand({
                        name: "create-masked-email-address",
                        type: LaunchType.UserInitiated,
                        arguments: { domain },
                      });
                    }}
                  />
                </ActionPanel>
              }
            />
          </>
        )}
      </List.Section>
    </List>
  )
}

type ViewDomainLogsProps = {
  domain: string;
}
function ViewDomainLogs({ domain }: ViewDomainLogsProps) {
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { isLoading, data } = useImprovMX<{ logs: DomainLog[] }>(`domains/${domain}/logs`);
 
  return <List navigationTitle={`Domain / ${domain} / Logs`} isLoading={isLoading} isShowingDetail={isShowingDetail}>
    {data?.logs.map(log => <List.Section key={log.id} title={log.subject}>
      {log.events.map(event => <List.Item key={event.id} title={event.status} subtitle={event.message} accessories={[
        { date: new Date(event.created) }
      ]} detail={<List.Item.Detail metadata={<List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Code" text={event.code.toString()} />
      </List.Item.Detail.Metadata>} />} actions={<ActionPanel>
        <Action title="Toggle Details" onAction={() => setIsShowingDetail(prev => !prev)} />
      </ActionPanel>} />)}
    </List.Section>)}
  </List>
}