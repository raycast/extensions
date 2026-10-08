import { Action, ActionPanel, Color, Icon, Keyboard, List, openExtensionPreferences } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { IPDetailView } from "./components/ip-detail";
import { QueryIPView } from "./query-ip";
import { collectIPs, geoLookupTargets } from "./lib/collect";
import { IPCHECK_URL } from "./lib/constants";
import { countryCodeToFlagEmoji, countryName, fetchGeo } from "./lib/geo";
import { GeoMap, IPEntry, SourceFailure } from "./lib/types";
import { isUsablePublicIP } from "./lib/valid-ip";

/**
 * ⌘⇧C is off limits — that is Keyboard.Shortcut.Common.Copy, already taken by "Copy IP" in
 * the same panel — so copy-all gets the next mnemonic over ("A" for all).
 */
const COPY_ALL_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "a" },
  Windows: { modifiers: ["ctrl", "shift"], key: "a" },
};

export default function Command() {
  const {
    data,
    isLoading,
    revalidate,
    error: collectError,
  } = useCachedPromise(collectIPs, [], {
    keepPreviousData: true,
    onError: (error) => {
      void showFailureToast(error, { title: "Could not look up IPs" });
    },
  });

  const entries = data?.entries ?? [];
  const failures = data?.failures ?? [];
  const targets = geoLookupTargets(entries);

  const { data: geo, isLoading: isLoadingGeo } = useCachedPromise(fetchGeo, [targets], {
    execute: targets.length > 0,
    keepPreviousData: true,
    onError: (error) => {
      void showFailureToast(error, { title: "Could not resolve IP locations" });
    },
  });

  const externalEntries = entries.filter((entry) => entry.kind === "external");
  const localEntries = entries.filter((entry) => entry.kind === "local");
  const allIPs = entries.map((entry) => entry.ip).join("\n");

  const actions = <SharedActions allIPs={allIPs} onRefresh={revalidate} />;

  return (
    <List
      isLoading={isLoading || isLoadingGeo}
      searchBarPlaceholder="Filter IPs, interfaces or locations"
      actions={actions}
    >
      <List.EmptyView
        icon={collectError ? Icon.Warning : Icon.Network}
        title={collectError ? "Could not look up IPs" : "No IPs to Show"}
        description={
          collectError
            ? collectError.message
            : "Every source is turned off. Enable at least one in the extension preferences."
        }
        actions={actions}
      />

      <List.Section title="External" subtitle={externalEntries.length ? `${externalEntries.length}` : undefined}>
        {externalEntries.map((entry) => (
          <IPListItem key={entry.key} entry={entry} geo={geo} allIPs={allIPs} onRefresh={revalidate} />
        ))}
      </List.Section>

      <List.Section title="Local" subtitle={localEntries.length ? `${localEntries.length}` : undefined}>
        {localEntries.map((entry) => (
          <IPListItem key={entry.key} entry={entry} geo={geo} allIPs={allIPs} onRefresh={revalidate} />
        ))}
      </List.Section>

      <List.Section title="Unavailable Sources">
        {failures.map((failure) => (
          <FailureListItem key={failure.source} failure={failure} allIPs={allIPs} onRefresh={revalidate} />
        ))}
      </List.Section>

      <List.Section title="More">
        <List.Item
          icon={Icon.MagnifyingGlass}
          title="Query IP"
          subtitle="Look up any IPv4 or IPv6 address"
          keywords={["query", "search", "lookup", "whois", "geo"]}
          actions={
            <ActionPanel>
              <Action.Push title="Query IP" icon={Icon.MagnifyingGlass} target={<QueryIPView />} />
              <SharedActionItems allIPs={allIPs} onRefresh={revalidate} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.ArrowRightCircle}
          title="Open IPCheck.ing"
          subtitle="Get IP Score, IP leak test, Speed test and more"
          keywords={["ipcheck", "myip", "website", "more", "details"]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url={IPCHECK_URL} />
              <SharedActionItems allIPs={allIPs} onRefresh={revalidate} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function IPListItem({
  entry,
  geo,
  allIPs,
  onRefresh,
}: {
  entry: IPEntry;
  geo: GeoMap | undefined;
  allIPs: string;
  onRefresh: () => void;
}) {
  const location = locationLabel(entry, geo);

  return (
    <List.Item
      icon={entry.kind === "local" ? Icon.Monitor : Icon.Globe}
      title={entry.ip}
      subtitle={entry.source}
      accessories={[{ text: location }, { tag: entry.family }]}
      keywords={[entry.source, entry.family, ...location.split(/[\s,]+/).filter(Boolean)]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            icon={Icon.Sidebar}
            target={<IPDetailView ip={entry.ip} source={entry.source} />}
          />
          <Action.CopyToClipboard title="Copy IP" content={entry.ip} shortcut={Keyboard.Shortcut.Common.Copy} />
          <Action.OpenInBrowser url={IPCHECK_URL} title="Open IPCheck.ing" />
          <SharedActionItems allIPs={allIPs} onRefresh={onRefresh} />
        </ActionPanel>
      }
    />
  );
}

/**
 * City-level labels come from the HTTPS lookup. If the source already reported a country
 * over TLS (the Cloudflare / IPCheck.ing trace), a mismatched lookup is ignored — that is
 * the last line of defense against a forged location sitting in the cache.
 */
function locationLabel(entry: IPEntry, geo: GeoMap | undefined): string {
  const info = geo?.[entry.ip];
  if (info?.label && countriesAgree(entry.countryCode, info.countryCode)) {
    return info.label;
  }

  return fallbackLocation(entry);
}

function countriesAgree(traceCode: string | undefined, lookupCode: string | undefined): boolean {
  if (!traceCode || !lookupCode) return true;
  return traceCode.toUpperCase() === lookupCode.toUpperCase();
}

/**
 * Until the HTTPS lookup answers, external entries can still show the country their own
 * trace response reported — so the list is never blank while a lookup is in flight.
 */
function fallbackLocation(entry: IPEntry): string {
  if (entry.kind === "local") {
    // A local interface can carry a public address (IPv6 typically does); those get a geo
    // lookup, so don't label them "Private" while it is still in flight.
    return isUsablePublicIP(entry.ip) ? "Resolving location…" : "Private Network";
  }

  const country = countryName(entry.countryCode);
  if (country) {
    return [country, countryCodeToFlagEmoji(entry.countryCode ?? "")].filter(Boolean).join(" ");
  }

  return "Resolving location…";
}

function FailureListItem({
  failure,
  allIPs,
  onRefresh,
}: {
  failure: SourceFailure;
  allIPs: string;
  onRefresh: () => void;
}) {
  return (
    <List.Item
      icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
      title={failure.source}
      subtitle={failure.message}
      keywords={["failed", "error", "unavailable"]}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          {/* No shortcut: ⌘, is reserved by Raycast for its own preferences action. */}
          <Action title="Configure Sources" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action.CopyToClipboard title="Copy Error Message" content={`${failure.source}: ${failure.message}`} />
          <Action.CopyToClipboard title="Copy All IPs" content={allIPs} shortcut={COPY_ALL_SHORTCUT} />
        </ActionPanel>
      }
    />
  );
}

function SharedActions({ allIPs, onRefresh }: { allIPs: string; onRefresh: () => void }) {
  return (
    <ActionPanel>
      <SharedActionItems allIPs={allIPs} onRefresh={onRefresh} />
    </ActionPanel>
  );
}

function SharedActionItems({ allIPs, onRefresh }: { allIPs: string; onRefresh: () => void }) {
  return (
    <>
      <Action.Push
        title="Query IP"
        icon={Icon.MagnifyingGlass}
        target={<QueryIPView />}
        shortcut={{ macOS: { modifiers: ["cmd"], key: "f" }, Windows: { modifiers: ["ctrl"], key: "f" } }}
      />
      <Action.CopyToClipboard title="Copy All IPs" content={allIPs} shortcut={COPY_ALL_SHORTCUT} />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={onRefresh}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
      {/* No shortcut: ⌘, is reserved by Raycast for its own preferences action. */}
      <Action title="Configure Sources" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </>
  );
}
