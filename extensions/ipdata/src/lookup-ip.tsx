import { Action, ActionPanel, Icon, LaunchProps, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Fragment, useEffect, useMemo, useState } from "react";
import { LookupDetail, RecordActions, SectionItems, stateIcon } from "./components/record";
import { cachedMyIp } from "./lib/cache";
import { resolveHost } from "./lib/dns";
import { useDebounce, useLookup, LookupState } from "./lib/hooks";
import { parseTarget, version } from "./lib/ip";
import { LookupError, LookupOk } from "./lib/ipdata";
import { getSettings, settingsKey } from "./lib/settings";

interface Row {
  ip: string;
  version: 4 | 6 | 0;
  // Own addresses arrive with their record already fetched, or with the keyed lookup's error.
  preset?: LookupOk;
  presetError?: LookupError;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.LookupIp }>) {
  const settings = getSettings();
  const hasKey = !!settings.apiKey;
  const initial = (props.arguments?.address || props.fallbackText || "").trim();
  const [searchText, setSearchText] = useState(initial);
  const query = useDebounce(searchText, 400);
  const target = useMemo(() => parseTarget(query), [query]);

  // A hostname resolves to one or more addresses; each becomes a row. While a new hostname resolves,
  // the previous rows stay under their own hostname.
  const host = target.kind === "host" ? target.host : null;
  const resolved = useCachedPromise((tag: string, h: string) => resolveHost(h), ["dns", host ?? ""], {
    execute: !!host,
    keepPreviousData: true,
    onError: () => undefined, // shown in the empty view instead of a toast
  });

  // With nothing typed, the list shows this machine's own addresses; Refresh bypasses their cache.
  const [mineNonce, setMineNonce] = useState(0);
  const mine = useCachedPromise(
    (tag: string, key: string, force: number) => {
      void tag;
      void key;
      return cachedMyIp(settings, force > 0);
    },
    ["myip", settingsKey(settings), mineNonce],
    { execute: target.kind === "empty", keepPreviousData: true },
  );
  const refreshMine = () => setMineNonce((n) => n + 1);

  const rows: Row[] = useMemo(() => {
    if (target.kind === "ip") return [{ ip: target.ip, version: version(target.ip) }];
    if (target.kind === "host") {
      if (resolved.error) return [];
      return (resolved.data?.addresses ?? []).map((r) => ({ ip: r.address, version: r.family }));
    }
    if (target.kind === "empty" && mine.data?.ok) {
      const out: Row[] = [];
      const { v4, v6, v4KeyError, v6KeyError } = mine.data;
      if (v4) out.push({ ip: v4.model.ip, version: 4, preset: v4, presetError: v4KeyError });
      if (v6) out.push({ ip: v6.model.ip, version: 6, preset: v6, presetError: v6KeyError });
      return out;
    }
    return [];
  }, [target, resolved.data, resolved.error, mine.data]);

  // Ids are the address, or "<address>#<tab>" for the tab rows under it. Raycast owns the selection,
  // except that a new set of rows (a new query) selects its first address once.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [forcedId, setForcedId] = useState<string | undefined>(undefined);
  const rowsKey = rows.map((r) => r.ip).join(",");
  useEffect(() => {
    setForcedId(rowsKey ? rowsKey.split(",")[0] : undefined);
  }, [rowsKey]);
  const onSelect = (id: string | null) => {
    setSelectedId(id);
    setForcedId(undefined);
  };
  const selectedIp = (selectedId ?? "").split("#")[0];
  const selected = rows.find((r) => r.ip === selectedIp) ?? rows[0] ?? null;

  // Only the selected row is looked up, so a hostname with many addresses costs one request.
  const lookup = useLookup(selected && !selected.preset ? selected.ip : null, settings);

  const isLoading =
    (target.kind === "host" && resolved.isLoading) || (target.kind === "empty" && mine.isLoading) || lookup.isLoading;

  const sectionTitle =
    target.kind === "ip"
      ? "Lookup"
      : target.kind === "host"
        ? (resolved.data?.host ?? target.host)
        : target.kind === "empty"
          ? "Your connection"
          : undefined;
  const sectionSubtitle =
    target.kind === "host" && rows.length ? `${rows.length} address${rows.length === 1 ? "" : "es"}` : undefined;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      throttle
      isShowingDetail={rows.length > 0}
      searchBarPlaceholder="IP address or hostname…"
      selectedItemId={forcedId}
      onSelectionChange={onSelect}
    >
      {target.kind === "invalid" ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Enter an IP address or hostname"
          description="Examples: 8.8.8.8 · 2606:4700::1111 · example.com"
        />
      ) : null}
      {target.kind === "host" && resolved.error ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title={`Could not resolve ${target.host}`}
          description={resolved.error.message}
          actions={<RetryActions onRetry={resolved.revalidate} />}
        />
      ) : null}
      {target.kind === "host" && !resolved.isLoading && resolved.data?.host === target.host && !rows.length ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title={`${target.host} has no addresses`}
          actions={<RetryActions onRetry={resolved.revalidate} />}
        />
      ) : null}
      {target.kind === "empty" && !mine.isLoading && !mine.data?.ok ? (
        <List.EmptyView
          icon={Icon.Globe}
          title="Look up an IP address or hostname"
          description={
            mine.data && !mine.data.ok
              ? `Your own addresses could not be detected: ${mine.data.message}`
              : "Type an IPv4 or IPv6 address, or a hostname such as example.com."
          }
          actions={<RetryActions onRetry={refreshMine} />}
        />
      ) : null}
      {rows.length ? (
        <List.Section title={sectionTitle} subtitle={sectionSubtitle}>
          {rows.map((row) => {
            const isSelected = selected?.ip === row.ip;
            const state: LookupState | null = row.preset
              ? row.presetError
                ? { status: "error", result: row.presetError }
                : { status: "ok", result: row.preset }
              : isSelected
                ? lookup.state
                : null;
            const onRefresh = row.preset ? refreshMine : lookup.refresh;
            return (
              <Fragment key={row.ip}>
                <List.Item
                  id={row.ip}
                  title={row.ip}
                  icon={stateIcon(state)}
                  accessories={row.version ? [{ text: `IPv${row.version}` }] : undefined}
                  detail={
                    state ? (
                      <LookupDetail ip={row.ip} state={state} />
                    ) : (
                      <List.Item.Detail markdown={`# ${row.ip}\n\nSelect this address to look it up.`} />
                    )
                  }
                  actions={
                    <RecordActions ip={row.ip} state={state} hasKey={hasKey} onRefresh={onRefresh}>
                      {rows.length > 1 ? (
                        <ActionPanel.Section>
                          <Action.CopyToClipboard
                            title="Copy All Addresses"
                            content={rows.map((r) => r.ip).join("\n")}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                          />
                        </ActionPanel.Section>
                      ) : null}
                    </RecordActions>
                  }
                />
                {isSelected ? (
                  <SectionItems parentId={row.ip} ip={row.ip} state={state} hasKey={hasKey} onRefresh={onRefresh} />
                ) : null}
              </Fragment>
            );
          })}
        </List.Section>
      ) : null}
    </List>
  );
}

// The only action of a failed search, on ↵: resolve the hostname or detect the own addresses again.
function RetryActions({ onRetry }: { onRetry: () => void }) {
  return (
    <ActionPanel>
      <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
    </ActionPanel>
  );
}
