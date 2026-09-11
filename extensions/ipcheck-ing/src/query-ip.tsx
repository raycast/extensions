import { Action, ActionPanel, Color, Icon, LaunchProps, List } from "@raycast/api";
import { useState } from "react";
import { IPDetailView } from "./components/ip-detail";
import { describeReservedIP, isIPv6, isValidIP } from "./lib/valid-ip";

export default function Command(props: LaunchProps<{ arguments: Arguments.QueryIp }>) {
  return <QueryIPView initialQuery={props.arguments?.ip} />;
}

export function QueryIPView({ initialQuery = "" }: { initialQuery?: string }) {
  const [searchText, setSearchText] = useState(initialQuery);
  const query = searchText.trim();
  const valid = isValidIP(query);
  const reserved = valid ? describeReservedIP(query) : undefined;

  return (
    <List
      searchText={searchText}
      searchBarPlaceholder="Enter an IPv4 or IPv6 address"
      onSearchTextChange={setSearchText}
      navigationTitle="Query IP"
    >
      {valid ? (
        <List.Item
          icon={reserved ? { source: Icon.Lock, tintColor: Color.Blue } : Icon.Globe}
          title={query}
          subtitle={reserved ?? "Public address"}
          accessories={[{ tag: isIPv6(query) ? "IPv6" : "IPv4" }]}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" icon={Icon.Sidebar} target={<IPDetailView ip={query} />} />
              <Action.CopyToClipboard title="Copy IP" content={query} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={query.length === 0 ? Icon.MagnifyingGlass : Icon.Warning}
          title={query.length === 0 ? "Query an IP" : "Not a Valid IP Address"}
          description={
            query.length === 0
              ? "Type any IPv4 or IPv6 address to look up where it is and who runs it."
              : `"${query}" is not a well-formed IPv4 or IPv6 address.`
          }
        />
      )}
    </List>
  );
}
