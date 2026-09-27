import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";

import { phpipam } from "./api";
import {
  AddressListItem,
  ErrorView,
  SubnetListItem,
  silentPromiseOptions,
} from "./components";
import type { IpAddress, SearchResults, Vlan, Vrf } from "./types";
import { s, subnetFamily } from "./utils";

const MIN_TERM_LENGTH = 3;
const DEBOUNCE_MS = 300;
/**
 * Short terms can match thousands of addresses on large instances; the list
 * stays responsive thanks to virtualization, but past this point narrowing
 * the query beats scrolling. Subnets/VLANs/VRFs are low-volume: uncapped.
 */
const MAX_ADDRESSES = 256;
/**
 * Search results carry raw decimal IPs without a family marker; only the
 * parent subnet knows whether "1" is 0.0.0.1 or ::1. Lookups run in the
 * background, and beyond this many distinct subnets the size heuristic
 * stays in charge.
 */
const MAX_FAMILY_LOOKUPS = 12;

function addressesTitle(total: number): string {
  return total > MAX_ADDRESSES
    ? `Addresses (${MAX_ADDRESSES}+)`
    : `Addresses (${total})`;
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Distinct parent-subnet ids of the address hits, capped for family lookups. */
function familyLookupKey(addresses: IpAddress[]): string {
  return [...new Set(addresses.map((a) => s(a.subnetId)).filter(Boolean))]
    .slice(0, MAX_FAMILY_LOOKUPS)
    .join(",");
}

function VlanListItem({ vlan }: { vlan: Vlan }) {
  const name = s(vlan.name);
  const number = s(vlan.number);
  const label = `VLAN ${number}`;
  return (
    <List.Item
      icon={Icon.Layers}
      title={label}
      subtitle={s(vlan.description) || name}
      accessories={name && name !== label ? [{ text: name }] : []}
      keywords={[name, number, s(vlan.description)]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy VLAN"
            content={name ? `${label} (${name})` : label}
          />
          <Action.CopyToClipboard
            title="Copy Name"
            content={name}
            shortcut={Keyboard.Shortcut.Common.New}
          />
        </ActionPanel>
      }
    />
  );
}

function VrfListItem({ vrf }: { vrf: Vrf }) {
  const name = s(vrf.name);
  const rd = s(vrf.rd);
  return (
    <List.Item
      icon={Icon.Map}
      title={name || `VRF #${s(vrf.vrfId)}`}
      subtitle={s(vrf.description) || rd}
      accessories={rd ? [{ text: `RD ${rd}` }] : []}
      keywords={[name, rd, s(vrf.description)]}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Name" content={name} />
          {rd ? (
            <Action.CopyToClipboard
              title="Copy Route Distinguisher"
              content={rd}
              shortcut={Keyboard.Shortcut.Common.Refresh}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, DEBOUNCE_MS);
  const term = debounced.trim();
  const searchable = term.length >= MIN_TERM_LENGTH;

  const { isLoading, data, error, revalidate } = usePromise(
    async (
      searchTerm: string,
      enabled: boolean,
    ): Promise<SearchResults | null> =>
      enabled ? phpipam.search(searchTerm) : null,
    [term, searchable],
    silentPromiseOptions,
  );

  const results = searchable ? (data ?? null) : null;
  // Families resolve in the background so results never wait on them; items
  // re-render with correct formatting once the parent subnets arrive. This
  // hook must run on every path, so the error return stays below it.
  const familyKey = results ? familyLookupKey(results.addresses) : "";
  const { data: families } = usePromise(
    async (ids: string): Promise<Map<string, 4 | 6>> => {
      const map = new Map<string, 4 | 6>();
      await Promise.all(
        ids
          .split(",")
          .filter(Boolean)
          .map(async (id) => {
            try {
              map.set(id, subnetFamily(await phpipam.subnet(id)));
            } catch {
              // Unresolved subnets keep the size-based family heuristic.
            }
          }),
      );
      return map;
    },
    [familyKey],
    silentPromiseOptions,
  );

  if (error) {
    return <ErrorView error={error} onRetry={revalidate} />;
  }
  const isEmptyResult =
    results !== null &&
    results.addresses.length === 0 &&
    results.subnets.length === 0 &&
    results.vlans.length === 0 &&
    results.vrfs.length === 0;

  return (
    <List
      isLoading={isLoading && searchable}
      onSearchTextChange={setQuery}
      throttle={false}
      searchBarPlaceholder="Search by IP, hostname, description, owner, MAC…"
    >
      {!searchable ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={`Type at least ${MIN_TERM_LENGTH} characters to search phpIPAM`}
          description="Searches addresses, subnets, VLANs and VRFs in one query."
        />
      ) : null}
      {isEmptyResult ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={`No matches for “${term}”`}
        />
      ) : null}
      {results ? (
        <>
          <List.Section title={addressesTitle(results.addresses.length)}>
            {results.addresses.slice(0, MAX_ADDRESSES).map((address) => (
              <AddressListItem
                key={s(address.id)}
                address={address}
                family={families?.get(s(address.subnetId))}
              />
            ))}
          </List.Section>
          <List.Section title={`Subnets (${results.subnets.length})`}>
            {results.subnets.map((subnet) => (
              <SubnetListItem key={`subnet-${s(subnet.id)}`} subnet={subnet} />
            ))}
          </List.Section>
          <List.Section title={`VLANs (${results.vlans.length})`}>
            {results.vlans.map((vlan) => (
              <VlanListItem key={`vlan-${s(vlan.vlanId)}`} vlan={vlan} />
            ))}
          </List.Section>
          <List.Section title={`VRFs (${results.vrfs.length})`}>
            {results.vrfs.map((vrf) => (
              <VrfListItem key={`vrf-${s(vrf.vrfId)}`} vrf={vrf} />
            ))}
          </List.Section>
        </>
      ) : null}
    </List>
  );
}
