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
import { domainIcon } from "./utils";
import { Alias, Domain, DomainLog } from "./types";
import { showFailureToast, useCachedState } from "@raycast/utils";
import ErrorComponent from "./components/ErrorComponent";
import { useImprovMX, useImprovMXPaginated } from "./hooks";
import { DOMAIN_LOG_EVENT_STATUS_COLORS } from "./constants";

export default function ManageDomainsAndAliases() {
  const { isLoading, error, data: domains, pagination } = useImprovMXPaginated<Domain, "domains">("domains");

  const { push } = useNavigation();
  const showAliases = async (domain: Domain) => {
    if (domain.banned || !domain.active) {
      showFailureToast("Domain not configured properly. Please configure your DNS settings", {
        title: "ImprovMX Error",
      });
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
          .map((domain) => (
            <List.Item
              key={domain.display}
              title={domain.display}
              icon={domainIcon(domain)}
              accessories={[{ text: { value: domain.aliases.length.toString() + " aliases" } }]}
              actions={
                <ActionPanel>
                  <Action title="Show Aliases" icon={Icon.Envelope} onAction={() => showAliases(domain)} />
                  <Action.Push
                    title="View Domain Logs"
                    icon={Icon.Paragraph}
                    target={<ViewDomainLogs domain={domain.display} />}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
      <List.Section title="Inactive Domains">
        {domains
          ?.filter((domain) => !domain.active)
          .map((domain) => (
            <List.Item
              key={domain.display}
              title={domain.display}
              icon={domainIcon(domain)}
              accessories={[{ text: { value: domain.aliases.length.toString() + " aliases" } }]}
              actions={
                <ActionPanel>
                  <Action title="Show Aliases" icon={Icon.Envelope} onAction={() => showAliases(domain)} />
                  <Action.Push
                    title="View Domain Logs"
                    icon={Icon.Paragraph}
                    target={<ViewDomainLogs domain={domain.display} />}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Add New Domain"
            icon={{ source: Icon.Plus }}
            actions={
              <ActionPanel>
                <Action
                  title="Add New Domain"
                  icon={Icon.Plus}
                  onAction={async () => {
                    await launchCommand({ name: "add-domain", type: LaunchType.UserInitiated });
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

type ViewAliasesProps = {
  domain: string;
};
function ViewAliases({ domain }: ViewAliasesProps) {
  const {
    isLoading,
    data: aliases,
    error,
    pagination,
  } = useImprovMXPaginated<Alias, "aliases">(`domains/${domain}/aliases`);

  return error ? (
    <ErrorComponent error={error} />
  ) : (
    <List isLoading={isLoading} searchBarPlaceholder="Search for alias..." pagination={pagination}>
      <List.Section title={`${domain} Aliases`}>
        {aliases.map((alias) => (
          <List.Item
            key={alias.alias}
            title={alias.alias + "@" + domain}
            subtitle={`-> ${alias.forward}`}
            accessories={[{ date: new Date(alias.created) }]}
            actions={
              <ActionPanel>
                <Action
                  title="Copy Alias"
                  icon={Icon.CopyClipboard}
                  onAction={async () => {
                    await Clipboard.copy(alias.alias + "@" + domain);
                    await showToast(Toast.Style.Success, "Copied", "Alias copied to clipboard");
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {!isLoading && (
        <List.Section title="Actions">
          <List.Item
            title="Create New Alias"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action
                  title="Create New Alias"
                  icon={Icon.Plus}
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
            icon={Icon.PlusCircle}
            actions={
              <ActionPanel>
                <Action
                  title="Create Masked Email Address"
                  icon={Icon.PlusCircle}
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
        </List.Section>
      )}
    </List>
  );
}

type ViewDomainLogsProps = {
  domain: string;
};
function ViewDomainLogs({ domain }: ViewDomainLogsProps) {
  const [isShowingDetail, setIsShowingDetail] = useCachedState("toggle-log-details", false);
  const { isLoading, data } = useImprovMX<{ logs: DomainLog[] }>(`domains/${domain}/logs`);
  const [status, setStatus] = useState("");

  return (
    <List
      navigationTitle={`Domain / ${domain} / Logs`}
      isLoading={isLoading}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder="Search log"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Status" onChange={setStatus}>
          <List.Dropdown.Item icon={Icon.Dot} title="All" value="" />
          <List.Dropdown.Section>
            {Object.entries(DOMAIN_LOG_EVENT_STATUS_COLORS).map(([status, color]) => (
              <List.Dropdown.Item
                key={status}
                icon={{ source: Icon.Dot, tintColor: color }}
                title={status}
                value={status}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {data?.logs.map((log) => (
        <List.Section key={log.id} title={log.subject}>
          {log.events
            .filter((log) => status === "" || log.status === status)
            .map((event) => (
              <List.Item
                key={event.id}
                title={event.status}
                keywords={[log.subject]}
                icon={{ source: Icon.Dot, tintColor: DOMAIN_LOG_EVENT_STATUS_COLORS[event.status] }}
                subtitle={event.message}
                accessories={[{ date: new Date(event.created) }]}
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="ID" text={event.id} />
                        <List.Item.Detail.Metadata.Label title="Code" text={event.code.toString()} />
                        <List.Item.Detail.Metadata.Label title="Created" text={new Date(event.created).toString()} />
                        <List.Item.Detail.Metadata.Label title="Local" text={event.local} />
                        <List.Item.Detail.Metadata.Label title="Message" text={event.message} />
                        <List.Item.Detail.Metadata.Label
                          title="Recipient"
                          text={`${event.recipient.name}<${event.recipient.email}>`}
                        />
                        <List.Item.Detail.Metadata.Label title="Server" text={event.server} />
                        <List.Item.Detail.Metadata.TagList title="Status">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={event.status}
                            color={DOMAIN_LOG_EVENT_STATUS_COLORS[event.status]}
                          />
                        </List.Item.Detail.Metadata.TagList>
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action
                      icon={Icon.AppWindowSidebarLeft}
                      title="Toggle Details"
                      onAction={() => setIsShowingDetail((prev) => !prev)}
                    />
                    <Action.OpenInBrowser icon={Icon.Download} title="Download Log" url={log.url} />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
