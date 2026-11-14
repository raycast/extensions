// What the menu bar shows, as plain data. meter.tsx turns it into MenuBarExtra elements; keeping the tree here
// means it can be built, compared and counted without Raycast (every native menu item costs time to open).
import { SERVICES, SETTINGS, TC_LABEL, LOW_DATA } from "./apps.ts";
import type { View } from "./data.ts";
import { modeOf } from "./sample.ts";
import type { Action } from "./sample.ts";
import {
  COUNTING,
  MIN,
  WINDOWS,
  aggregate,
  bytes2,
  bytes3,
  clock,
  counts,
  displayName,
  fmt,
  hostLabel,
  lastRate,
  sparkline,
  spikes,
  sumTotal,
  unattr,
  winLabel,
} from "./stats.ts";
import type { AppAgg } from "./stats.ts";

export const TOP_APPS = 5; // per window; the rest lives in the details view
const MENU_HOSTS = 2;
const MENU_NETS = 8;
const MENU_SPIKES = 8;

export type Ic =
  | "network"
  | "mobile"
  | "wifi"
  | "chart"
  | "clock"
  | "bolt"
  | "stopwatch"
  | "window"
  | "gear"
  | "eye"
  | "undo"
  | "reset"
  | "trash"
  | "pin"
  | "question"
  | "terminal"
  | "list";
export type Icon = Ic | { file: string };

export type Do =
  | { do: "act"; a: Action }
  | { do: "capture" }
  | { do: "open"; url: string }
  | { do: "finder"; path: string }
  | { do: "pin"; win: number }
  | { do: "toggle"; id: string }
  | { do: "details"; win?: number }
  | { do: "prefs" };

export type Node =
  | { k: "item"; title: string; subtitle?: string; tooltip?: string; icon?: Icon; run?: Do }
  | { k: "sub"; title: string; icon?: Icon; children: Node[] }
  | { k: "sec"; title?: string; children: Node[] };

const item = (title: string, o: Omit<Extract<Node, { k: "item" }>, "k" | "title"> = {}): Node => ({
  k: "item",
  title,
  ...o,
});
const sub = (title: string, icon: Icon | undefined, children: Node[]): Node => ({ k: "sub", title, icon, children });
const sec = (title: string | undefined, children: Node[]): Node => ({ k: "sec", title, children });

export function countNodes(ns: Node[]): number {
  return ns.reduce((n, x) => n + 1 + (x.k === "item" ? 0 : countNodes(x.children)), 0);
}

const day = (t: number) =>
  new Date(t).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// ---------- menu bar title, icon, tooltip ----------

export type Bar = { title?: string; tooltip: string; hs: boolean; tint?: "red" | "orange" };

export function buildBar(v: View, mp: Preferences.Meter): Bar {
  const { prefs, now, raw, win, filter, aggs, hsToday, total, net, last, events } = v;
  const hs = last?.hs ?? false;
  const a = aggs[win];
  const rate = lastRate(raw);
  const recentSpike = events.find((e) => e.end >= now - 2 * MIN);
  const counting = !net || counts(filter, net);
  const [totIn, totOut] = sumTotal(total, filter);

  let title: string | undefined;
  if (mp.barMode === "total") title = mp.showUpload ? `↓${fmt(a.inB)} ↑${fmt(a.outB)}` : `↓${fmt(a.inB)}`;
  if (mp.barMode === "sum" && total) title = `Σ ${fmt(totIn + totOut)}`;
  if (mp.barMode === "rate" && rate)
    title = mp.showUpload ? `↓${fmt(rate.inBps)}/s ↑${fmt(rate.outBps)}/s` : `↓${fmt(rate.inBps)}/s`;
  if (recentSpike && title !== undefined) title = `⚡ ${title}`;
  if (!counting && title !== undefined) title = `⏸ ${title}`;

  const capMB = Number(prefs.hotspotCapMB) || 0;
  const capUsed = capMB ? hsToday / (capMB * 1e6) : 0;
  const tint = capUsed >= 0.9 ? "red" : capUsed >= 0.5 || recentSpike || hs ? "orange" : undefined;
  const tooltip = !counting
    ? `Not counting on this network (counting ${COUNTING[filter.mode]})`
    : recentSpike
      ? `Spike: ${recentSpike.app} · ${fmt(recentSpike.bytes)}`
      : `Last ${winLabel(win)}: ${bytes2(a.inB, a.outB)}${total ? ` · total ${fmt(totIn + totOut)}` : ""}`;
  return { title, tooltip, hs, tint };
}

// ---------- the open menu ----------

export function buildMenu(v: View, cap: { running: boolean; until: number }): Node[] {
  const { prefs, now, raw, all, win, filter, aggs, hsToday, total, undoAt, nets, net, last, events } = v;
  const hs = last?.hs ?? false;
  const rate = lastRate(raw);
  const mode = modeOf(prefs.capture);
  const counting = !net || counts(filter, net);
  const [totIn, totOut] = sumTotal(total, filter);
  const capMB = Number(prefs.hotspotCapMB) || 0;
  const here = nets[net]?.label ?? (last ? `${last.iface} · ${last.gw}` : "Network");

  const totalSub = total
    ? [
        sub(`Total  ${bytes3(totIn, totOut)}`, "chart", [
          item(`Since ${day(total.since)}`),
          sec(undefined, [
            item("Reset Total", { icon: "reset", run: { do: "act", a: "reset" } }),
            item("Clear All History", {
              subtitle: "windows, spikes, total",
              icon: "trash",
              run: { do: "act", a: "clear" },
            }),
            ...(undoAt > 0
              ? [item(`Undo (reset at ${clock(undoAt)})`, { icon: "undo", run: { do: "act", a: "undo" } })]
              : []),
          ]),
        ]),
      ]
    : [];

  return [
    sec(undefined, [
      item(`${here}${counting ? "" : "  (not counted)"}`, {
        subtitle: hs ? `today ${fmt(hsToday)}${capMB ? ` / ${capMB}M` : ""}` : undefined,
      }),
      item(rate ? `Now  ↓ ${fmt(rate.inBps)}/s  ↑ ${fmt(rate.outBps)}/s` : "Now  —", {
        subtitle: sparkline(all, now, 15),
      }),
      ...totalSub,
      sub(`Networks  ·  counting ${COUNTING[filter.mode]}`, "wifi", networks(v)),
    ]),
    sec(
      "Windows",
      WINDOWS.map((m) =>
        sub(
          `${m === win ? "✓ " : ""}${winLabel(m)}   ${bytes3(aggs[m].inB, aggs[m].outB)}`,
          "clock",
          windowItems(m, v),
        ),
      ),
    ),
    sec("Spikes", [
      sub(
        `Recent Spikes (${events.length})`,
        "bolt",
        events.length === 0
          ? [item(`No spikes above ${v.spikeMB} MB/min in the last 4 hours`)]
          : [...events]
              .reverse()
              .slice(0, MENU_SPIKES)
              .map((e) =>
                item(`${clock(e.start)} · ${fmt(e.bytes)} · ${displayName(e.app)}`, {
                  subtitle: `${Math.round((e.end - e.start) / MIN)} min`,
                }),
              ),
      ),
    ]),
    sec(undefined, [
      item(
        cap.running
          ? mode === "manual"
            ? `Capturing… (~${Math.max(0, Math.round((cap.until - now) / 1000))} s left)`
            : "Stream running · full per-app breakdown"
          : "Capture Source (30 s)",
        {
          subtitle: cap.running ? undefined : "includes short-lived connections",
          icon: "stopwatch",
          run: cap.running ? undefined : { do: "capture" },
        },
      ),
      ...(hs ? [item(LOW_DATA.title, { icon: "mobile", run: { do: "open", url: LOW_DATA.url } })] : []),
      item("Open Details", { icon: "window", run: { do: "details" } }),
      item("Preferences…", { icon: "gear", run: { do: "prefs" } }),
    ]),
  ];
}

// Every network seen so far, with its usage since the last reset. Clicking one adds/removes it from the
// "Selected Networks" list, which only matters when the Count Traffic On preference is set to that.
function networks(v: View): Node[] {
  const { nets, net, total, filter } = v;
  const list = Object.values(nets).sort(
    (x, y) =>
      Number(y.id === net) - Number(x.id === net) ||
      Number(filter.picked.has(y.id)) - Number(filter.picked.has(x.id)) ||
      y.seen - x.seen,
  );
  const before = total?.nets.unknown;
  return [
    item(
      filter.mode === "selected"
        ? filter.picked.size
          ? "Counting only the ticked / named networks"
          : filter.typed
            ? "No network matches the typed Wi-Fi names yet: counting nothing"
            : "Nothing ticked yet: counting everything"
        : `Counting ${COUNTING[filter.mode]}`,
      { subtitle: filter.mode === "selected" ? undefined : "change in Preferences" },
    ),
    sec("Seen networks (click to tick)", [
      ...(list.length === 0 && !before ? [item("No network seen yet")] : []),
      ...list.slice(0, MENU_NETS).map((n) => {
        const used = total?.nets[n.id] ?? [0, 0];
        return item(`${filter.picked.has(n.id) ? "✓ " : ""}${n.id === net ? "● " : ""}${n.label}`, {
          subtitle: bytes2(used[0], used[1]),
          icon: n.kind === "hotspot" ? "mobile" : n.kind === "wired" ? "network" : "wifi",
          tooltip:
            n.id === "hotspot"
              ? "Personal hotspots and metered links are grouped as one network"
              : `${n.id}${n.mac ? ` · router ${n.mac}` : ""}`,
          run: { do: "toggle", id: n.id },
        });
      }),
      ...(list.length > MENU_NETS ? [item(`${list.length - MENU_NETS} older networks not shown`)] : []),
      ...(before
        ? [
            item("Before networks were tracked", {
              subtitle: bytes2(before[0], before[1]),
              tooltip: "Usage recorded by an earlier version; only counted when all networks are counted",
            }),
          ]
        : []),
    ]),
  ];
}

function windowItems(m: number, v: View): Node[] {
  const { now, all, aggs, paths, spikeMB } = v;
  const agg = aggs[m];
  const inWin = all.filter((s) => s.t >= now - m * MIN);
  const ev = spikes(inWin, v.threshold).sort((x, y) => y.bytes - x.bytes)[0];
  const [unIn, unOut] = unattr(agg);
  const manual = modeOf(v.prefs.capture) === "manual";
  const total = agg.inB + agg.outB;
  return [
    item(sparkline(inWin, now, m), { subtitle: `each block ${Math.round(m / 12)} min` }),
    item(
      ev
        ? `Biggest spike: ${clock(ev.start)} · ${fmt(ev.bytes)} · ${displayName(ev.app)}`
        : `No spikes (threshold ${spikeMB} MB/min)`,
    ),
    sec("Apps", [
      ...agg.apps.slice(0, TOP_APPS).map((app) => appSub(app, total, paths[app.label])),
      ...(agg.apps.length > TOP_APPS
        ? [item(`All ${agg.apps.length} Apps…`, { icon: "list", run: { do: "details", win: m } })]
        : []),
      sub(`Unattributed   ${bytes2(unIn, unOut)}`, "question", [
        item(
          manual
            ? "Short-lived connections that closed before the 10 s snapshot"
            : "Packet headers, system traffic and gaps the stream missed",
        ),
        ...(manual ? estimate(inWin, unIn, unOut) : []),
      ]),
    ]),
    sec(undefined, [item("Show This Window in the Bar", { icon: "pin", run: { do: "pin", win: m } })]),
  ];
}

// Manual mode only: spread the unattributed bytes over apps in the proportions the short captures saw.
function estimate(inWin: View["all"], unIn: number, unOut: number): Node[] {
  const capRows = inWin.filter((s) => s.cap);
  const capAgg = aggregate(capRows);
  const capIn = capAgg.apps.reduce((n, a) => n + a.inB, 0);
  const capOut = capAgg.apps.reduce((n, a) => n + a.outB, 0);
  const est = capAgg.apps
    .map((a) => ({
      label: a.label,
      inB: capIn ? (a.inB / capIn) * unIn : 0,
      outB: capOut ? (a.outB / capOut) * unOut : 0,
    }))
    .sort((x, y) => y.inB + y.outB - (x.inB + x.outB))
    .slice(0, 3);
  if (!est.length) return [];
  const span = Math.round(capRows.reduce((n, s) => n + s.dt, 0) / 1000);
  return [
    sec(
      `Estimate: based on the ${span} s capture`,
      est.map((a) => item(`~ ${displayName(a.label)}`, { subtitle: `↓ ${fmt(a.inB)}  ↑ ${fmt(a.outB)}` })),
    ),
  ];
}

function appSub(app: AppAgg, total: number, path?: string): Node {
  return sub(
    `${displayName(app.label)}   ${bytes2(app.inB, app.outB)}`,
    path ? { file: path } : "terminal",
    appItems(app, total, path),
  );
}

// At most 10 nodes: opening a submenu builds all of its items.
function appItems(app: AppAgg, total: number, path?: string): Node[] {
  const sum = app.inB + app.outB;
  const hosts = Object.entries(app.hosts)
    .sort((x, y) => y[1] - x[1])
    .slice(0, MENU_HOSTS);
  const hostSum = hosts.reduce((n, h) => n + h[1], 0);
  const tc = Object.entries(app.tc).sort((x, y) => y[1] - x[1])[0]?.[0];
  const setting = SETTINGS[app.label];
  const about = SERVICES[app.label];
  return [
    item(bytes2(app.inB, app.outB), {
      subtitle: `${total ? Math.round((sum / total) * 100) : 0}% of window${tc ? ` · ${TC_LABEL[tc] ?? tc}` : ""}`,
    }),
    ...(app.tunIn + app.tunOut > 0
      ? [
          item(`Through VPN tunnel: ${bytes2(app.tunIn, app.tunOut)}`, {
            tooltip: "These bytes show up as the VPN client's traffic on the physical network and are counted there.",
          }),
        ]
      : []),
    ...(about ? [item(about)] : []),
    ...(hosts.length
      ? [
          sec("Talking to", [
            ...hosts.map(([ip, b]) => item(hostLabel(ip), { subtitle: fmt(b) })),
            ...(sum - hostSum > 0.1 * sum
              ? [
                  item("Other / closed connections", {
                    subtitle: fmt(sum - hostSum),
                    tooltip: "Short-lived connections whose destination was not seen",
                  }),
                ]
              : []),
          ]),
        ]
      : []),
    ...(app.retx > 0
      ? [
          item(
            `Retransmitted: ${fmt(app.retx)} (${app.outB ? ((app.retx / app.outB) * 100).toFixed(1) : "0"}% of upload)`,
            {
              tooltip: "Data you paid for twice: bytes sent again because of packet loss. TCP only.",
            },
          ),
        ]
      : []),
    ...(setting ? [item(setting.title, { icon: "gear", run: { do: "open", url: setting.url } })] : []),
    ...(path ? [item("Reveal in Finder", { icon: "eye", run: { do: "finder", path } })] : []),
  ];
}
