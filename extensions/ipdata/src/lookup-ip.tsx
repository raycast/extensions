import { Action, ActionPanel, Icon, LaunchProps, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Fragment, useMemo, useRef, useState } from "react";
import { LookupDetail, RecordActions, SectionItems, stateIcon } from "./components/record";
import { cachedMyIp } from "./lib/cache";
import { resolveHost } from "./lib/dns";
import { useDebounce, useLookup, LookupState } from "./lib/hooks";
import { parseTarget, version } from "./lib/ip";
import { LookupOk } from "./lib/ipdata";
import { getSettings, settingsKey } from "./lib/settings";

interface Row {
  ip: string;
  version: 4 | 6 | 0;
  // Own addresses arrive with their record already fetched.
  preset?: LookupOk;
}

export default function Command(
  props: LaunchProps<{ arguments: { address?: string }; launchContext: { tab?: string } }>,
) {
  const settings = getSettings();
  const hasKey = !!settings.apiKey;
  const initial = (props.arguments?.address ?? props.fallbackText ?? "").trim();
  const [searchText, setSearchText] = useState(initial);
  const query = useDebounce(searchText, 400);
  const target = useMemo(() => parseTarget(query), [query]);

  // A hostname resolves to one or more addresses; each becomes a row.
  const host = target.kind === "host" ? target.host : null;
  const resolved = useCachedPromise((tag: string, h: string) => resolveHost(h), ["dns", host ?? ""], {
    execute: !!host,
    keepPreviousData: false,
    onError: () => undefined, // shown in the empty view instead of a toast
  });

  // With nothing typed, the list shows this machine's own addresses.
  const mine = useCachedPromise(
    (tag: string, key: string) => {
      void tag;
      void key;
      return cachedMyIp(settings);
    },
    ["myip", settingsKey(settings)],
    { execute: target.kind === "empty", keepPreviousData: true },
  );

  const rows: Row[] = useMemo(() => {
    if (target.kind === "ip") return [{ ip: target.ip, version: version(target.ip) }];
    if (target.kind === "host") return (resolved.data ?? []).map((r) => ({ ip: r.address, version: r.family }));
    if (target.kind === "empty" && mine.data?.ok) {
      const out: Row[] = [];
      if (mine.data.v4) out.push({ ip: mine.data.v4.model.ip, version: 4, preset: mine.data.v4 });
      if (mine.data.v6) out.push({ ip: mine.data.v6.model.ip, version: 6, preset: mine.data.v6 });
      return out;
    }
    return [];
  }, [target, resolved.data, mine.data]);

  // Only the selected row is looked up, so a hostname with many addresses costs one request.
  // Ids are the address, or "<address>#<section>" for the section rows under it.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIp = (selectedId ?? "").split("#")[0];
  const selected = rows.find((r) => r.ip === selectedIp) ?? rows[0] ?? null;
  // A deeplink can open a tab: the first selection Raycast reports for the address is redirected
  // to "<address>#<tab>" once, so Raycast's own initial selection cannot override it.
  const wantedTab = props.launchContext?.tab;
  const tabApplied = useRef(false);
  const onSelect = (id: string | null) => {
    if (wantedTab && !tabApplied.current && id && !id.includes("#")) {
      tabApplied.current = true;
      setSelectedId(`${id}#${wantedTab}`);
      return;
    }
    setSelectedId(id);
  };
  const lookup = useLookup(selected && !selected.preset ? selected.ip : null, settings);

  const isLoading =
    (target.kind === "host" && resolved.isLoading) || (target.kind === "empty" && mine.isLoading) || lookup.isLoading;

  const sectionTitle =
    target.kind === "ip"
      ? "Lookup"
      : target.kind === "host"
        ? target.host
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
      selectedItemId={selectedId ?? undefined}
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
        />
      ) : null}
      {target.kind === "host" && !resolved.isLoading && resolved.data && resolved.data.length === 0 ? (
        <List.EmptyView icon={Icon.XMarkCircle} title={`${target.host} has no addresses`} />
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
        />
      ) : null}
      {rows.length ? (
        <List.Section title={sectionTitle} subtitle={sectionSubtitle}>
          {rows.map((row) => {
            const isSelected = selected?.ip === row.ip;
            const state: LookupState | null = row.preset
              ? { status: "ok", result: row.preset }
              : isSelected
                ? lookup.state
                : null;
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
                    <RecordActions
                      ip={row.ip}
                      state={state}
                      hasKey={hasKey}
                      onRefresh={row.preset ? mine.revalidate : lookup.refresh}
                    >
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
                  <SectionItems
                    parentId={row.ip}
                    ip={row.ip}
                    state={state}
                    hasKey={hasKey}
                    onRefresh={row.preset ? mine.revalidate : lookup.refresh}
                  />
                ) : null}
              </Fragment>
            );
          })}
        </List.Section>
      ) : null}
    </List>
  );
}
