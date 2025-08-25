// @ts-nocheck
import React, { useState } from "react";
import { Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { useCachedPromise, showFailureToast } from "@raycast/utils";
import { piHoleAPI } from "./lib/api";

interface TopClient {
  ip: string;
  name: string;
  count: number;
}

export default function TopDomains() {
  const [viewMode, setViewMode] = useState<"domains" | "clients">("domains");

  const {
    data: topDomains,
    isLoading: isDomainsLoading,
    revalidate: revalidateDomains,
  } = useCachedPromise(
    async () => {
      return await piHoleAPI.getTopDomains(25);
    },
    [],
    {
      initialData: { allowed: [], blocked: [] },
    }
  );

  const {
    data: topClients,
    isLoading: isClientsLoading,
    revalidate: revalidateClients,
  } = useCachedPromise(
    async () => {
      return await piHoleAPI.getTopClients(25);
    },
    [],
    {
      initialData: [],
    }
  );

  const isLoading = isDomainsLoading || isClientsLoading;

  const revalidateAll = () => {
    revalidateDomains();
    revalidateClients();
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  const clientsArray = Array.isArray(topClients)
    ? topClients
        .map((client: TopClient) => ({
          client: client.name || client.ip,
          ip: client.ip,
          count: client.count,
        }))
        .sort((a, b) => b.count - a.count)
    : [];

  if (viewMode === "clients") {
    return (
      <List
        isLoading={isLoading}
        searchBarAccessory={
          <List.Dropdown
            tooltip="Select View"
            value={viewMode}
            onChange={(value) => setViewMode(value as "domains" | "clients")}
          >
            <List.Dropdown.Item title="Domains" value="domains" />
            <List.Dropdown.Item title="Clients" value="clients" />
          </List.Dropdown>
        }
      >
        <List.Section title={`Top Clients (${clientsArray.length})`}>
          {clientsArray.map((item, index) => (
            <List.Item
              key={item.client}
              title={item.client}
              subtitle={`${item.count} queries`}
              icon={{ source: Icon.ComputerChip, tintColor: Color.Blue }}
              accessories={[
                { text: `#${index + 1}`, icon: Icon.Trophy },
                { text: formatNumber(item.count), icon: Icon.BarChart },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Information">
                    <Action.CopyToClipboard
                      title="Copy to Clipboard"
                      content={item.client}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Utilities">
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={revalidateAll}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>

        {clientsArray.length === 0 && !isLoading && (
          <List.EmptyView
            title="No Clients Found"
            description="No clients with recorded queries were found"
            actions={
              <ActionPanel>
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidateAll} />
              </ActionPanel>
            }
          />
        )}
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select View"
          value={viewMode}
          onChange={(value) => setViewMode(value as "domains" | "clients")}
        >
          <List.Dropdown.Item title="Domains" value="domains" />
          <List.Dropdown.Item title="Clients" value="clients" />
        </List.Dropdown>
      }
    >
      <List.Section title={`Allowed Domains (${topDomains?.allowed.length || 0})`}>
        {topDomains?.allowed
          .sort((a, b) => b.count - a.count)
          .map((item, index) => (
            <List.Item
              key={`allowed-${item.domain}`}
              title={item.domain}
              subtitle={`${item.count} queries`}
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              accessories={[
                { text: `#${index + 1}`, icon: Icon.Trophy },
                { text: formatNumber(item.count), icon: Icon.BarChart },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Domain Management">
                    <Action
                      title="Add to Blocklist"
                      icon={Icon.Minus}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        try {
                          await piHoleAPI.addToBlacklist(item.domain);
                          revalidateAll();
                        } catch (error) {
                          await showFailureToast(error, { title: "Failed to add domain to blocklist" });
                        }
                      }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Information">
                    <Action.CopyToClipboard
                      title="Copy to Clipboard"
                      content={item.domain}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.OpenInBrowser
                      title="Open in Browser"
                      url={`https://${item.domain}`}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Utilities">
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={revalidateAll}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
      </List.Section>

      <List.Section title={`Blocked Domains (${topDomains?.blocked.length || 0})`}>
        {topDomains?.blocked
          .sort((a, b) => b.count - a.count)
          .map((item, index) => (
            <List.Item
              key={`blocked-${item.domain}`}
              title={item.domain}
              subtitle={`${item.count} blocked attempts`}
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
              accessories={[
                { text: `#${index + 1}`, icon: Icon.Trophy },
                { text: formatNumber(item.count), icon: Icon.BarChart },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Domain Management">
                    <Action
                      title="Add to Allowlist"
                      icon={Icon.Plus}
                      onAction={async () => {
                        try {
                          await piHoleAPI.addToWhitelist(item.domain);
                          revalidateAll();
                        } catch (error) {
                          await showFailureToast(error, { title: "Failed to add domain to allowlist" });
                        }
                      }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Information">
                    <Action.CopyToClipboard
                      title="Copy to Clipboard"
                      content={item.domain}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action.OpenInBrowser
                      title="View Domain (may Be Blocked)"
                      url={`https://${item.domain}`}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Utilities">
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={revalidateAll}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
      </List.Section>

      {(topDomains?.allowed.length || 0) === 0 && (topDomains?.blocked.length || 0) === 0 && !isLoading && (
        <List.EmptyView
          title="No Data Found"
          description="No domains found in statistics"
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidateAll} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
