// The record view shared by Look Up IP and My IP: the address row's pane (heading, map, location
// attributes), the tab rows under the selected address and their panes, and the action panel.
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  environment,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { Fragment, ReactNode } from "react";
import { cardMarkdown, hasStreetLevel, jsonSvg, MAP_ZOOM, mapSvg, PANE_MAP_H, PANE_MAP_W } from "../lib/card";
import { mapLayers } from "../lib/map";
import { flagIcon } from "../lib/flags";
import { LookupState } from "../lib/hooks";
import { analyze } from "../lib/analysis";
import { IpRecord, localTime, LookupError, LookupOk, RawRecord } from "../lib/ipdata";
import * as P from "../lib/present";

const M = List.Item.Detail.Metadata;

// The tabs listed under a selected address. The address row itself is the overview.
export type TabKey = "json" | "analysis" | "scores" | "flags" | "blocklists" | "connection" | "operator" | "owner";
export const TABS: { key: TabKey; title: string; icon: Icon }[] = [
  { key: "json", title: "Raw JSON", icon: Icon.Code },
  { key: "analysis", title: "Analysis", icon: Icon.Text },
  { key: "scores", title: "Scores", icon: Icon.Gauge },
  { key: "flags", title: "Flags", icon: Icon.Flag },
  { key: "blocklists", title: "Blocklists", icon: Icon.List },
  { key: "connection", title: "Connection", icon: Icon.Wifi },
  { key: "operator", title: "Operator", icon: Icon.Network },
  { key: "owner", title: "Owner", icon: Icon.Building },
];

const KEY_HINT = "Needs an API key (⌘⇧K)";

function reservedMarkdown(ip: string, label: string): string {
  return [
    `# 🔒 ${label}`,
    "",
    `\`${ip}\``,
    "",
    "Private, loopback, link-local, carrier-grade NAT, multicast and documentation ranges are not routable on the public internet, so there is nothing to look up. The address was not sent anywhere.",
  ].join("\n");
}

function errorMarkdown(ip: string, err: LookupError): string {
  const lines = [`# ⚠️ ${err.message}`, "", `\`${ip}\``];
  if (err.kind === "quota" && err.source === "free") {
    const reset = P.resetIn(err.rate);
    lines.push(
      "",
      `The free tier allows 1,000 city-level lookups a day from your connection${reset ? ` and resets in ${reset}` : ""}. Add an API key (⌘⇧K) for unlimited lookups and the full record.`,
    );
  } else if (err.kind === "key" || (err.kind === "quota" && err.source === "key")) {
    lines.push("", "Check the API key and endpoint in the extension preferences (⌘⇧K).");
  } else if (err.kind === "network") {
    // A failed lookup has no map, so Refresh is the second action, on ⌘↵ (see RecordActions).
    lines.push("", "Check your connection and press ⌘↵ to try again.");
  }
  return lines.join("\n");
}

// ---- small helpers ---------------------------------------------------------------------------

const rawBool = (raw: RawRecord, key: string): boolean | null =>
  typeof raw[key] === "boolean" ? (raw[key] as boolean) : null;
const rawStr = (v: unknown): string | null =>
  typeof v === "string" && v ? v : typeof v === "number" ? String(v) : null;
// "2026-01-02T03:04:05Z" → "2026-01-02"; anything else unchanged.
const dateOnly = (v: unknown): string => {
  const s = rawStr(v);
  if (!s) return "—";
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : s;
};
// Every row followed by a separator line.
const separated = (rows: ReactNode[]) =>
  rows.filter(Boolean).map((row, i) => (
    <Fragment key={i}>
      {row}
      <M.Separator />
    </Fragment>
  ));

// ---- the address row: all the location attributes, each with a separator -----------------------

function LocationMetadata({ m }: { m: IpRecord }) {
  const coords = P.coordsText(m);
  const maps = P.googleMapsUrl(m);
  const tz = m.time_zone;
  const tzLine = tz
    ? [tz.name, tz.abbr, tz.offset ? `UTC${tz.offset.replace(/^(\+|-)(\d\d)(\d\d)$/, "$1$2:$3")}` : null]
        .filter(Boolean)
        .join(" · ")
    : null;
  const country = [m.country_name, m.country_code].filter(Boolean).join(" · ");
  const continent = m.continent ?? null;
  // Computed when shown, so a cached record never shows a stale clock.
  const now = tz ? localTime(tz.name) : null;
  return (
    <M>
      {separated([
        m.region ? (
          <M.Label key="region" title="Region" text={[m.region, m.region_code].filter(Boolean).join(" · ")} />
        ) : null,
        m.postal ? <M.Label key="postal" title="Postal Code" text={m.postal} /> : null,
        country ? <M.Label key="country" title="Country" icon={flagIcon(m)} text={country} /> : null,
        continent ? <M.Label key="continent" title="Continent" text={continent} /> : null,
        m.is_eu != null ? <M.Label key="eu" title="EU Member" text={m.is_eu ? "yes" : "no"} /> : null,
        coords && maps ? <M.Link key="coords" title="Coordinates" target={maps} text={coords} /> : null,
        tzLine ? <M.Label key="tz" title="Time Zone" text={tzLine} /> : null,
        now ? <M.Label key="time" title="Local Time" text={now} /> : null,
        tz && tz.is_dst != null ? <M.Label key="dst" title="Daylight Saving" text={tz.is_dst ? "yes" : "no"} /> : null,
        P.currencyText(m) ? <M.Label key="currency" title="Currency" text={P.currencyText(m) ?? ""} /> : null,
        P.languagesText(m) ? <M.Label key="languages" title="Languages" text={P.languagesText(m) ?? ""} /> : null,
        m.calling_code ? <M.Label key="calling" title="Calling Code" text={`+${m.calling_code}`} /> : null,
      ])}
    </M>
  );
}

// ---- the tabs: native metadata rows, the tab's title value as the first row -------------------

const tagRow = (key: string, title: string, text: string, color: Color) => (
  <M.TagList key={key} title={title}>
    <M.TagList.Item text={text} color={color} />
  </M.TagList>
);
const hintRow = (key: string, title: string, hint: string) => (
  <M.Label key={key} title={title} text={{ value: hint, color: Color.SecondaryText }} />
);

type ThreatRaw = Record<string, unknown> & { scores?: Record<string, unknown> };

function ScoresMetadata({ result }: { result: LookupOk }) {
  const t = result.model.threat as ThreatRaw | null;
  if (!t) return <M>{separated([hintRow("trust", "Trust Score", KEY_HINT)])}</M>;
  const s = t.scores ?? {};
  const trust = typeof s.trust_score === "number" ? s.trust_score : null;
  const rows: ReactNode[] = [
    trust != null
      ? tagRow("trust", "Trust Score", `${trust} · ${P.riskLabel(trust)}`, P.riskColor(trust))
      : hintRow("trust", "Trust Score", "No score in this response"),
    ...(
      [
        ["threat_score", "Threat Score"],
        ["vpn_score", "VPN Score"],
        ["proxy_score", "Proxy Score"],
      ] as const
    ).map(([key, title]) =>
      typeof s[key] === "number" ? <M.Label key={key} title={title} text={String(s[key])} /> : null,
    ),
  ];
  return <M>{separated(rows)}</M>;
}

// The flags as one cloud of pills: set flags in red, the rest in grey, like the badges on ipdata.co.
const CLOUD_FLAGS: { key: string; title: string }[] = [
  { key: "is_tor", title: "Tor" },
  { key: "is_vpn", title: "VPN" },
  { key: "is_datacenter", title: "Datacenter" },
  { key: "is_proxy", title: "Proxy" },
  { key: "is_icloud_relay", title: "Privacy Relay" },
  { key: "is_anonymous", title: "Anonymous" },
  { key: "is_known_attacker", title: "Known Attacker" },
  { key: "is_known_abuser", title: "Known Abuser" },
  { key: "is_threat", title: "Threat" },
  { key: "is_bogon", title: "Bogon" },
];

function FlagsMetadata({ result }: { result: LookupOk }) {
  const t = result.model.threat as ThreatRaw | null;
  if (!t) return <M>{separated([hintRow("flags", "Flags", KEY_HINT)])}</M>;
  const present = CLOUD_FLAGS.filter((f) => typeof t[f.key] === "boolean");
  const lists = Array.isArray(t.blocklists) ? (t.blocklists as unknown[]) : [];
  return (
    <M>
      <M.TagList title="Flags">
        {present.map((f) => (
          <M.TagList.Item key={f.key} text={f.title} color={t[f.key] ? Color.Red : Color.SecondaryText} />
        ))}
        {lists.length ? (
          <M.TagList.Item text={`Reported ${lists.length} time${lists.length === 1 ? "" : "s"}`} color={Color.Red} />
        ) : null}
      </M.TagList>
    </M>
  );
}

// Blocklists as rows: the list's name and category on the left, first seen, last seen and days seen on
// the right; the row links to the list's website.
function BlocklistsMetadata({ result }: { result: LookupOk }) {
  const t = result.model.threat;
  if (!t) return <M>{separated([hintRow("lists", "Blocklists", KEY_HINT)])}</M>;
  const lists = Array.isArray(t.blocklists) ? (t.blocklists as Record<string, unknown>[]) : [];
  const rows: ReactNode[] = [
    <M.Label
      key="count"
      title="Blocklists"
      text={
        lists.length
          ? { value: `Listed on ${lists.length} blocklist${lists.length === 1 ? "" : "s"}`, color: Color.Red }
          : { value: "Not listed on any blocklist", color: Color.Green }
      }
    />,
    ...lists.map((b, i) => {
      const name = rawStr(b.name) ?? "unknown";
      const category = rawStr(b.category) ?? rawStr(b.type);
      const site = rawStr(b.site) ?? rawStr(b.website);
      const title = category ? `${name} · ${category}` : name;
      const days = rawStr(b.days_seen);
      const seen = [
        `${dateOnly(b.first_seen)} → ${dateOnly(b.last_seen)}`,
        days ? `${days} day${days === "1" ? "" : "s"}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return site ? (
        <M.Link key={i} title={title} target={site} text={seen} />
      ) : (
        <M.Label key={i} title={title} text={seen} />
      );
    }),
  ];
  return <M>{separated(rows)}</M>;
}

function ConnectionMetadata({ result }: { result: LookupOk }) {
  const raw = result.raw;
  const m = result.model;
  const mobile = rawBool(raw, "mobile") ?? rawBool(raw, "is_mobile");
  const flags = (
    [
      ["is_anycast", "Anycast"],
      ["is_leased", "Leased"],
      ["is_satellite", "Satellite"],
    ] as const
  )
    .map(([key, title]) => ({ key, title, value: rawBool(raw, key) }))
    .filter((f) => f.value != null);
  const known = mobile != null || !!m.carrier || flags.length > 0;
  if (!known) {
    return (
      <M>
        {separated([
          hintRow(
            "conn",
            "Connection",
            result.source === "key" ? "No connection attributes in this response" : KEY_HINT,
          ),
        ])}
      </M>
    );
  }
  const set = flags.filter((f) => f.value).map((f) => f.title);
  const title = m.carrier ? m.carrier.name : set.length ? set.join(", ") : "Direct connection";
  const rows: ReactNode[] = [
    <M.Label key="conn" title="Connection" text={title} />,
    mobile != null || m.carrier
      ? tagRow(
          "mobile",
          "Mobile",
          (mobile ?? !!m.carrier) ? "yes" : "no",
          (mobile ?? !!m.carrier) ? Color.Blue : Color.SecondaryText,
        )
      : null,
    P.carrierText(m) ? <M.Label key="carrier" title="Carrier" text={P.carrierText(m) ?? ""} /> : null,
    ...flags.map((f) => tagRow(f.key, f.title, f.value ? "yes" : "no", f.value ? Color.Orange : Color.SecondaryText)),
  ];
  return <M>{separated(rows)}</M>;
}

function OperatorMetadata({ m }: { m: IpRecord }) {
  const op = P.operatorOf(m);
  return (
    <M>
      {separated([
        <M.Label key="operator" title="Operator" text={op.name ?? op.asn ?? "Unknown"} />,
        op.asn ? (
          <M.Link key="asn" title="ASN" target={`https://bgp.tools/as/${op.asn.replace(/^AS/i, "")}`} text={op.asn} />
        ) : null,
        op.type ? <M.Label key="type" title="Usage Type" text={op.type} /> : null,
        op.route ? <M.Label key="route" title="Route" text={op.route} /> : null,
        op.domain ? <M.Link key="domain" title="Domain" target={`https://${op.domain}`} text={op.domain} /> : null,
      ])}
    </M>
  );
}

function OwnerMetadata({ m }: { m: IpRecord }) {
  const owner = P.ownerOf(m);
  return (
    <M>
      {separated([
        <M.Label key="owner" title="Owner" text={owner.name ?? "Unknown"} />,
        owner.domain ? (
          <M.Link key="domain" title="Domain" target={`https://${owner.domain}`} text={owner.domain} />
        ) : null,
        owner.network ? <M.Label key="network" title="Network" text={owner.network} /> : null,
        owner.type ? <M.Label key="type" title="Type" text={owner.type} /> : null,
        !owner.fromCompany
          ? hintRow("note", "Note", "Operator organization shown; the company record needs an API key")
          : null,
      ])}
    </M>
  );
}

// The Analysis tab: the kind of address as the heading, the analysis sentences, then the summary.
function analysisMarkdown(result: LookupOk): string {
  if (!result.model.threat) return `## ${KEY_HINT}\n`;
  const a = analyze(result);
  return [`## ${a.type === "-" ? "Address" : a.type}`, "", a.analysis, "", `**${a.summary}**`].join("\n");
}

// ---- panes ---------------------------------------------------------------------------------------

// The right-hand pane of a list item for one lookup state and tab (none = the address row).
export function LookupDetail({ ip, state, view }: { ip: string; state: LookupState; view?: TabKey }) {
  switch (state.status) {
    case "loading":
      return <List.Item.Detail isLoading markdown={`# ${ip}\n\nLooking up…`} />;
    case "reserved":
      return <List.Item.Detail markdown={reservedMarkdown(ip, state.label)} />;
    case "error":
      return <List.Item.Detail markdown={errorMarkdown(ip, state.result)} />;
    case "ok":
      return view ? <TabDetail result={state.result} view={view} /> : <LocationDetail result={state.result} />;
  }
}

const headingFor = (m: IpRecord) => `## ${m.emoji ? m.emoji + " " : ""}${P.placeOf(m).short}\n\n`;

// The Raw JSON tab: the response drawn with grey keys and blue values.
function JsonPane({ result }: { result: LookupOk }) {
  return <List.Item.Detail markdown={cardMarkdown(jsonSvg(result.raw, environment.appearance))} />;
}

// The address row: heading, the map with its fill, and the location attributes.
function LocationDetail({ result }: { result: LookupOk }) {
  const m = result.model;
  const { data: map, isLoading } = usePromise(
    async (lat: number | null, lon: number | null, street: boolean) =>
      !street || lat == null || lon == null
        ? null
        : mapLayers({ lat, lon, width: PANE_MAP_W, height: PANE_MAP_H, zoom: MAP_ZOOM }),
    [m.latitude, m.longitude, hasStreetLevel(m)],
    { onError: () => undefined },
  );
  const svg = mapSvg(m, {
    appearance: environment.appearance,
    map: map ?? null,
    mapStatus: !hasStreetLevel(m) ? "country" : isLoading ? "loading" : map ? "ready" : "unavailable",
  });
  const note = result.degraded ? "\n\n> Daily city-level quota used; showing country-level data until it resets." : "";
  return (
    <List.Item.Detail
      isLoading={isLoading}
      markdown={headingFor(m) + cardMarkdown(svg) + note}
      metadata={<LocationMetadata m={m} />}
    />
  );
}

function TabDetail({ result, view }: { result: LookupOk; view: TabKey }) {
  const m = result.model;
  switch (view) {
    case "json":
      return <JsonPane result={result} />;
    case "analysis":
      return <List.Item.Detail markdown={analysisMarkdown(result)} />;
    case "scores":
      return <List.Item.Detail metadata={<ScoresMetadata result={result} />} />;
    case "flags":
      return <List.Item.Detail metadata={<FlagsMetadata result={result} />} />;
    case "blocklists":
      return <List.Item.Detail metadata={<BlocklistsMetadata result={result} />} />;
    case "connection":
      return <List.Item.Detail metadata={<ConnectionMetadata result={result} />} />;
    case "operator":
      return <List.Item.Detail metadata={<OperatorMetadata m={m} />} />;
    case "owner":
      return <List.Item.Detail metadata={<OwnerMetadata m={m} />} />;
  }
}

export function JsonDetail({ ip, raw, host }: { ip: string; raw: RawRecord; host: string }) {
  const text = JSON.stringify(raw, null, 2);
  return (
    <Detail
      navigationTitle={`${ip} · JSON`}
      markdown={`\`GET https://${host}/${ip}\`\n\n\`\`\`json\n${text}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy JSON" content={text} />
          <Action.OpenInBrowser title="View Online" url={P.ipdataUrl(ip)} icon={Icon.Globe} />
        </ActionPanel>
      }
    />
  );
}

// ---- actions ---------------------------------------------------------------------------------------

export function RecordActions({
  ip,
  state,
  hasKey,
  onRefresh,
  children,
}: {
  ip: string;
  state: LookupState | null;
  hasKey: boolean;
  onRefresh?: () => void;
  children?: ReactNode;
}) {
  const ok = state?.status === "ok" ? state.result : null;
  const m = ok?.model ?? null;
  const apple = m ? P.appleMapsUrl(m) : null;
  const google = m ? P.googleMapsUrl(m) : null;
  const coords = m ? P.coordsText(m) : null;
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.CopyToClipboard title="Copy Address" content={ip} />
        {/* The second action gets ⌘↵ from Raycast, which hides any shortcut of its own, so it has none.
            Without a map (errors, reserved addresses) Refresh takes this slot; with one it sits below on ⌘R. */}
        {apple ? (
          <Action.Open title="Open in Maps" target={apple} icon={Icon.Map} />
        ) : onRefresh ? (
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
        ) : null}
        {google ? (
          <Action.OpenInBrowser
            title="Open in Google Maps"
            url={google}
            icon={Icon.Globe}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          />
        ) : null}
      </ActionPanel.Section>
      {children}
      <ActionPanel.Section>
        {ok ? (
          <Action.Push
            title="Show JSON"
            icon={Icon.Code}
            target={<JsonDetail ip={ip} raw={ok.raw} host={ok.host} />}
            shortcut={{ modifiers: ["cmd"], key: "j" }}
          />
        ) : null}
        {ok ? (
          <Action.CopyToClipboard
            title="Copy JSON"
            content={JSON.stringify(ok.raw, null, 2)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "j" }}
          />
        ) : null}
        {m ? (
          <Action.CopyToClipboard
            title="Copy Location"
            content={P.placeOf(m).short}
            shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          />
        ) : null}
        {m ? (
          <Action.CopyToClipboard
            title="Copy Operator"
            content={P.operatorLine(m)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          />
        ) : null}
        {coords ? (
          <Action.CopyToClipboard
            title="Copy Coordinates"
            content={coords}
            shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
          />
        ) : null}
      </ActionPanel.Section>
      <ActionPanel.Section>
        {onRefresh && apple ? (
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={onRefresh}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        ) : null}
        <Action
          title={hasKey ? "Change API Key" : "Add API Key"}
          icon={Icon.Key}
          onAction={openExtensionPreferences}
          shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="View Online" url={P.ipdataUrl(ip)} icon={Icon.Globe} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

// The tab rows shown under the selected address; ids are "<parent id>#<tab key>".
export function SectionItems({
  parentId,
  ip,
  state,
  hasKey,
  onRefresh,
}: {
  parentId: string;
  ip: string;
  state: LookupState | null;
  hasKey: boolean;
  onRefresh?: () => void;
}) {
  return (
    <>
      {TABS.map((tab) => (
        <List.Item
          key={tab.key}
          id={`${parentId}#${tab.key}`}
          title={tab.title}
          icon={{ source: tab.icon, tintColor: Color.SecondaryText }}
          detail={
            state ? (
              <LookupDetail ip={ip} state={state} view={tab.key} />
            ) : (
              <List.Item.Detail markdown={`# ${ip}\n\nLooking up…`} />
            )
          }
          actions={<RecordActions ip={ip} state={state} hasKey={hasKey} onRefresh={onRefresh} />}
        />
      ))}
      <List.Item
        id={`${parentId}#online`}
        title="View Online"
        icon={{ source: Icon.Globe, tintColor: Color.SecondaryText }}
        accessories={[{ text: "ipdata.co" }]}
        detail={
          <List.Item.Detail
            markdown={`## View Online\n\nPress Enter to open [${P.ipdataUrl(ip)}](${P.ipdataUrl(ip)}) in your browser.`}
          />
        }
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="View Online" url={P.ipdataUrl(ip)} icon={Icon.Globe} />
            <Action.CopyToClipboard title="Copy Link" content={P.ipdataUrl(ip)} />
          </ActionPanel>
        }
      />
    </>
  );
}

// Icon for a list item in a given state: the country flag once known.
export function stateIcon(state: LookupState | null) {
  if (!state) return Icon.Globe;
  if (state.status === "ok") return flagIcon(state.result.model);
  if (state.status === "reserved") return Icon.Lock;
  if (state.status === "error") return { source: Icon.Warning, tintColor: Color.Orange };
  return Icon.Globe;
}
