import fs from "fs";
import { useMemo, useState } from "react";
import { ActionPanel, Action, List, Icon, Color, Detail } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import type { Domain } from "./interface";
import { databasePath, listQuery } from "./constants";
import { getDomainURL, groupDomains } from "./utils";

function ActiveDropdown(props: { onSelectionChange: (newValue: string) => void }) {
  const { onSelectionChange } = props;

  return (
    <List.Dropdown tooltip="Filter Status" storeValue={true} onChange={onSelectionChange}>
      <List.Dropdown.Item key="all" value="all" title="All" />
      <List.Dropdown.Item key="active" value="active" title="Published" />
      <List.Dropdown.Item key="inactive" value="inactive" title="Not Published" />
    </List.Dropdown>
  );
}

export default function Command() {
  if (!fs.existsSync(databasePath)) {
    return (
      <Detail
        markdown={"# LocalCan is not installed \n Install it at: [https://www.localcan.com](https://www.localcan.com)"}
        navigationTitle="LocalCan not installed"
        actions={
          <ActionPanel title="Test">
            <Action.OpenInBrowser url="https://www.localcan.com" title="Go to https://www.localcan.com" />
          </ActionPanel>
        }
      />
    );
  }

  const [filter, setFilter] = useState<string>("all");

  const { data: domains, isLoading } = useSQL<Domain>(databasePath, listQuery);

  const groups = useMemo(() => groupDomains(domains ?? [], filter), [domains, filter]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search Domains"
      searchBarAccessory={<ActiveDropdown onSelectionChange={setFilter} />}
    >
      {groups.flatMap((group) => group.domains).length === 0 ? (
        <List.EmptyView icon={Icon.List} title="No domains" />
      ) : (
        groups.map((group) => (
          <List.Section key={group.id} title={group.name}>
            {group.domains
              .filter((domain) => (filter === "all" ? true : filter === "active" ? domain.active : !domain.active))
              .map((domain, index) => (
                <List.Item
                  key={index}
                  title={domain.domain}
                  subtitle={[
                    domain.type_to ? `${domain.type_to}://${domain.domain_to}:${domain.port_to}` : domain.port,
                    ...(domain.tunnel_active && domain.tunnel_url ? [domain.tunnel_url] : []),
                  ].join(", ")}
                  icon={{
                    value: domain.active ? Icon.CheckCircle : Icon.XMarkCircle,
                    tooltip: domain.active ? "Published" : "Not Published",
                  }}
                  accessories={[
                    ...(domain.tunnel_active ? [{ icon: Icon.Globe, tooltip: "Tunnel" }] : []),
                    {
                      tag: {
                        value: domain.type,
                        color: domain.type === "https" ? Color.Green : undefined,
                      },
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser url={getDomainURL(domain)} />
                      {domain.tunnel_active && domain.tunnel_url ? (
                        <Action.OpenInBrowser url={`${domain.tunnel_url}`} title="Open Tunnel in Browser" />
                      ) : undefined}
                      <Action.CopyToClipboard content={getDomainURL(domain)} />
                      {domain.tunnel_active && domain.tunnel_url ? (
                        <Action.CopyToClipboard content={`${domain.tunnel_url}`} title="Copy Tunnel to Clipboard" />
                      ) : undefined}
                      <Action.Open
                        title="Open LocalCan"
                        target="LocalCan"
                        application="LocalCan"
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                        icon={Icon.AppWindow}
                      />
                    </ActionPanel>
                  }
                />
              ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
