// @ts-nocheck
import React, { useState } from "react";
import { Action, ActionPanel, List, Icon, Color } from "@raycast/api";
import { useCachedPromise, showFailureToast } from "@raycast/utils";
import { piHoleAPI } from "./lib/api";

interface QueryLogEntry {
  timestamp: string;
  query_type: string;
  domain: string;
  client: string;
  status: string;
  reply_type: string;
  reply_time: number;
  dnssec: string;
}

export default function QueryLog() {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "blocked" | "allowed">("all");

  const {
    data: queryLog,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      return await piHoleAPI.getQueryLog();
    },
    [],
    {
      initialData: { queries: [], cursor: "" },
    }
  );

  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "blocked":
        return { source: Icon.XMarkCircle, tintColor: Color.Red };
      case "allowed":
      case "ok":
        return { source: Icon.CheckCircle, tintColor: Color.Green };
      case "cached":
        return { source: Icon.CircleProgress, tintColor: Color.Blue };
      default:
        return { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
    }
  };

  const getStatusText = (status: string): string => {
    switch (status.toLowerCase()) {
      case "blocked":
        return "🔴 BLOCKED";
      case "allowed":
      case "ok":
        return "🟢 ALLOWED";
      case "cached":
        return "🔵 CACHED";
      default:
        return "❓ UNKNOWN";
    }
  };

  const getQueryTypeColor = (queryType: string) => {
    switch (queryType) {
      case "A":
        return Color.Green;
      case "AAAA":
        return Color.Blue;
      case "CNAME":
        return Color.Orange;
      case "PTR":
        return Color.Purple;
      case "MX":
        return Color.Yellow;
      case "TXT":
        return Color.SecondaryText;
      default:
        return Color.PrimaryText;
    }
  };

  const filterQueries = (queries: QueryLogEntry[]): QueryLogEntry[] => {
    let filtered = queries;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((query) => {
        if (statusFilter === "blocked") {
          return query.status.toLowerCase() === "blocked";
        } else if (statusFilter === "allowed") {
          return query.status.toLowerCase() === "allowed" || query.status.toLowerCase() === "ok";
        }
        return true;
      });
    }

    // Filter by search text
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        (query) =>
          query.domain.toLowerCase().includes(searchLower) ||
          query.client.toLowerCase().includes(searchLower) ||
          query.query_type.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  const filteredQueries = filterQueries(queryLog?.queries || []);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by domain, client, or type..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Status"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as "all" | "blocked" | "allowed")}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Blocked Only" value="blocked" />
          <List.Dropdown.Item title="Allowed Only" value="allowed" />
        </List.Dropdown>
      }
    >
      <List.Section title={`Query Log (${filteredQueries.length} results)`}>
        {filteredQueries.map((query, index) => (
          <List.Item
            key={`${query.timestamp}-${index}`}
            title={query.domain}
            subtitle={`${query.client} • ${formatDate(query.timestamp)}`}
            icon={getStatusIcon(query.status)}
            accessories={[
              {
                text: query.query_type,
                icon: { source: Icon.Dot, tintColor: getQueryTypeColor(query.query_type) },
              },
              {
                text: `${query.reply_time}ms`,
                icon: Icon.Clock,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Information">
                  <Action.CopyToClipboard
                    title="Copy Domain"
                    content={query.domain}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Client"
                    content={query.client}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Domain Management">
                  {query.status.toLowerCase() === "blocked" ? (
                    <Action
                      title="Add to Allowlist"
                      icon={Icon.Plus}
                      onAction={async () => {
                        try {
                          await piHoleAPI.addToWhitelist(query.domain);
                          revalidate();
                        } catch (error) {
                          await showFailureToast(error, { title: "Failed to add domain to allowlist" });
                        }
                      }}
                    />
                  ) : (
                    <Action
                      title="Add to Blocklist"
                      icon={Icon.Minus}
                      style={Action.Style.Destructive}
                      onAction={async () => {
                        try {
                          await piHoleAPI.addToBlacklist(query.domain);
                          revalidate();
                        } catch (error) {
                          await showFailureToast(error, { title: "Failed to add domain to blocklist" });
                        }
                      }}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section title="Utilities">
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={revalidate}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={`
# DNS Query Details

## General Information
- **Domain**: ${query.domain}
- **Status**: ${getStatusText(query.status)}
- **Client**: ${query.client}
- **Date & Time**: ${formatDate(query.timestamp)}

## Technical Details
- **Query Type**: ${query.query_type}
- **Reply Type**: ${query.reply_type}
- **Response Time**: ${query.reply_time}ms
- **DNSSEC**: ${query.dnssec || "Not available"}

## Status Description
${
  query.status.toLowerCase() === "blocked"
    ? "This query was **blocked** by Pi-hole because the domain is on a blocklist."
    : query.status.toLowerCase() === "cached"
      ? "This query was answered from Pi-hole's **cache**, which speeds up the response."
      : "This query was **allowed** and forwarded to the upstream DNS server."
}
                `}
              />
            }
          />
        ))}
      </List.Section>

      {filteredQueries.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Results"
          description={
            searchText || statusFilter !== "all"
              ? "No queries found matching the applied filters"
              : "No DNS queries have been recorded"
          }
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action
                title="Clear Filters"
                icon={Icon.Multiply}
                onAction={() => {
                  setSearchText("");
                  setStatusFilter("all");
                }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
