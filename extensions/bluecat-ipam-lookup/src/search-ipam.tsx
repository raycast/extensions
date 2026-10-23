import { Action, ActionPanel, Color, Icon, Keyboard, LaunchProps, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { addressUrl, cacheScope, detectKind, getLinkedRecords, networkUrl, recordUrl, searchIPAM } from "./api";
import { Network, ResourceRecord, SearchResult } from "./types";

type AddressResult = Extract<SearchResult, { kind: "address" }>;
type NetworkResult = Extract<SearchResult, { kind: "network" }>;
type RecordResult = Extract<SearchResult, { kind: "record" }>;

const KIND_LABELS = { ip: "IP address", network: "network", dns: "DNS record" } as const;

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchIpam }>) {
  const [searchText, setSearchText] = useState(props.arguments.query || props.fallbackText || "");
  const query = searchText.trim();
  const scope = cacheScope();

  // scope is part of the cache key so results from another server or account are never reused.
  const { data, isLoading } = useCachedPromise((...args: [string, string]) => searchIPAM(args[0]), [query, scope], {
    execute: query.length > 0,
    keepPreviousData: true,
    failureToastOptions: { title: "BlueCat lookup failed" },
  });

  const results = query ? (data ?? []) : [];
  const addresses = results.filter((r): r is AddressResult => r.kind === "address");
  const networks = results.filter((r): r is NetworkResult => r.kind === "network");
  const records = results.filter((r): r is RecordResult => r.kind === "record");

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={results.length > 0}
      throttle
      searchBarPlaceholder="IP address, CIDR network, or DNS name…"
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {!query ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search BlueCat IPAM"
          description="e.g. 192.0.2.10, 192.0.2.0/24, or host.example.com"
        />
      ) : (
        !isLoading && (
          <List.EmptyView
            icon={Icon.XMarkCircle}
            title="No Results"
            description={`No matching ${KIND_LABELS[detectKind(query)]} found`}
          />
        )
      )}
      <List.Section title="IP Addresses">
        {addresses.map((r) => (
          <AddressItem key={`a-${r.item.id}`} result={r} />
        ))}
      </List.Section>
      <List.Section title={addresses.length > 0 || detectKind(query) === "ip" ? "Containing Networks" : "Networks"}>
        {networks.map((r) => (
          <NetworkItem key={`n-${r.item.id}`} network={r.item} />
        ))}
      </List.Section>
      <List.Section title="DNS Records">
        {records.map((r) => (
          <RecordItem key={`r-${r.item.id}`} record={r.item} zoneId={r.zoneId} />
        ))}
      </List.Section>
    </List>
  );
}

function UserDefinedFields({ fields }: { fields?: Record<string, unknown> | null }) {
  const entries = Object.entries(fields ?? {}).filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (entries.length === 0) return null;
  return (
    <>
      <List.Item.Detail.Metadata.Separator />
      {entries.map(([key, value]) => (
        <List.Item.Detail.Metadata.Label
          key={key}
          title={key}
          text={typeof value === "object" ? JSON.stringify(value) : String(value)}
        />
      ))}
    </>
  );
}

function stateColor(state?: string | null): Color {
  switch (state) {
    case "STATIC":
      return Color.Blue;
    case "DHCP_RESERVED":
    case "DHCP_ALLOCATED":
    case "DHCP_LEASED":
      return Color.Purple;
    case "GATEWAY":
      return Color.Orange;
    case "RESERVED":
      return Color.Yellow;
    default:
      return Color.SecondaryText;
  }
}

function AddressItem({ result }: { result: AddressResult }) {
  const { item: address, network } = result;
  const {
    data: linked,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise((...args: [number, string]) => getLinkedRecords(args[0]), [address.id, cacheScope()], {
    onError: () => undefined,
  });
  const url = addressUrl(address, network);

  return (
    <List.Item
      icon={{ source: Icon.Dot, tintColor: stateColor(address.state) }}
      title={address.address}
      subtitle={address.name ?? undefined}
      detail={
        <List.Item.Detail
          isLoading={isLoading}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Address" text={address.address} />
              <List.Item.Detail.Metadata.Label title="Name" text={address.name || "—"} />
              <List.Item.Detail.Metadata.TagList title="State">
                <List.Item.Detail.Metadata.TagList.Item
                  text={address.state ?? "UNKNOWN"}
                  color={stateColor(address.state)}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title="MAC Address" text={address.macAddress?.address || "—"} />
              <List.Item.Detail.Metadata.Label title="Type" text={address.type} />
              <List.Item.Detail.Metadata.Label title="ID" text={String(address.id)} />
              {network && (
                <>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Network" text={network.range} />
                  <List.Item.Detail.Metadata.Label title="Network Name" text={network.name || "—"} />
                  <List.Item.Detail.Metadata.Label title="Gateway" text={network.gateway || "—"} />
                </>
              )}
              <List.Item.Detail.Metadata.Separator />
              {error ? (
                <List.Item.Detail.Metadata.Label
                  title="DNS Records"
                  text={{ value: "Unavailable", color: Color.Red }}
                  icon={Icon.ExclamationMark}
                />
              ) : linked && linked.length > 0 ? (
                linked.map((r) => (
                  <List.Item.Detail.Metadata.Label
                    key={r.id}
                    title="DNS Record"
                    text={`${r.absoluteName} (${recordTypeLabel(r)})`}
                  />
                ))
              ) : (
                <List.Item.Detail.Metadata.Label title="DNS Records" text={isLoading ? "Loading…" : "None"} />
              )}
              <UserDefinedFields fields={address.userDefinedFields} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {url && <Action.OpenInBrowser title="Open in BlueCat" url={url} />}
          {network && (
            <Action.OpenInBrowser
              title="Open Network in BlueCat"
              url={networkUrl(network)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            />
          )}
          <Action.CopyToClipboard title="Copy Address" content={address.address} />
          {address.name && <Action.CopyToClipboard title="Copy Name" content={address.name} />}
          {address.macAddress?.address && (
            <Action.CopyToClipboard title="Copy MAC Address" content={address.macAddress.address} />
          )}
          {error && (
            <Action
              title="Retry DNS Record Lookup"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
          )}
          <EntityActions id={address.id} url={url} />
        </ActionPanel>
      }
    />
  );
}

function NetworkItem({ network }: { network: Network }) {
  const url = networkUrl(network);
  return (
    <List.Item
      icon={Icon.Network}
      title={network.range}
      subtitle={network.name ?? undefined}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Range" text={network.range} />
              <List.Item.Detail.Metadata.Label title="Name" text={network.name || "—"} />
              <List.Item.Detail.Metadata.Label title="Gateway" text={network.gateway || "—"} />
              <List.Item.Detail.Metadata.Label title="Type" text={network.type} />
              <List.Item.Detail.Metadata.Label title="ID" text={String(network.id)} />
              <UserDefinedFields fields={network.userDefinedFields} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in BlueCat" url={url} />
          <Action.CopyToClipboard title="Copy Range" content={network.range} />
          {network.gateway && <Action.CopyToClipboard title="Copy Gateway" content={network.gateway} />}
          {network.name && <Action.CopyToClipboard title="Copy Name" content={network.name} />}
          <EntityActions id={network.id} url={url} />
        </ActionPanel>
      }
    />
  );
}

function recordTypeLabel(record: ResourceRecord): string {
  return record.recordType ?? record.type.replace(/Record$/, "");
}

function recordValue(record: ResourceRecord): string {
  if (record.addresses && record.addresses.length > 0) {
    return record.addresses.map((a) => (typeof a === "string" ? a : (a.address ?? ""))).join(", ");
  }
  if (record.linkedRecord) {
    return record.linkedRecord.absoluteName ?? record.linkedRecord.name ?? "";
  }
  return record.rdata ?? "";
}

function RecordItem({ record, zoneId }: { record: ResourceRecord; zoneId?: number }) {
  const url = recordUrl(record, zoneId);
  const value = recordValue(record);
  return (
    <List.Item
      icon={Icon.Globe}
      title={record.absoluteName}
      accessories={[{ tag: recordTypeLabel(record) }]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Name" text={record.absoluteName} />
              <List.Item.Detail.Metadata.TagList title="Record Type">
                <List.Item.Detail.Metadata.TagList.Item text={recordTypeLabel(record)} color={Color.Green} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title="Value" text={value || "—"} />
              <List.Item.Detail.Metadata.Label title="TTL" text={record.ttl != null ? String(record.ttl) : "Default"} />
              <List.Item.Detail.Metadata.Label title="Type" text={record.type} />
              <List.Item.Detail.Metadata.Label title="ID" text={String(record.id)} />
              <UserDefinedFields fields={record.userDefinedFields} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {url && <Action.OpenInBrowser title="Open in BlueCat" url={url} />}
          <Action.CopyToClipboard title="Copy Name" content={record.absoluteName} />
          {value && <Action.CopyToClipboard title="Copy Value" content={value} />}
          <EntityActions id={record.id} url={url} />
        </ActionPanel>
      }
    />
  );
}

function EntityActions({ id, url }: { id: number; url?: string }) {
  return (
    <ActionPanel.Section>
      <Action.CopyToClipboard
        title="Copy Object ID"
        content={String(id)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
      />
      {url && (
        <Action.CopyToClipboard
          title="Copy BlueCat URL"
          content={url}
          shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
        />
      )}
    </ActionPanel.Section>
  );
}
