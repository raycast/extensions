import { Action, ActionPanel, Icon, List, open } from "@raycast/api";
import type { LaunchProps } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { SERVICES, SETTINGS, TC_LABEL } from "./apps.ts";
import { load, readBarWindow, readPickedSync, tick, viewSig } from "./data.ts";
import { chartMarkdown } from "./chart.ts";
import {
  COUNTING,
  MIN,
  WINDOWS,
  appPick,
  bytes2,
  clock,
  displayName,
  fmt,
  hostLabel,
  unattr,
  unattrPick,
  winLabel,
} from "./stats.ts";
import type { Sample } from "./sample.ts";

const REFRESH_MS = 5000;
const UNATTRIBUTED =
  "Traffic the interface moved that could not be pinned on an app: packet headers, system traffic and moments the stream did not cover. The interface counters themselves are exact.";

export default function Command(props: LaunchProps<{ launchContext: { window?: number } }>) {
  const asked = props.launchContext?.window;
  const [win, setWin] = useState(() => (WINDOWS.some((m) => m === asked) ? asked! : (readBarWindow() ?? 60)));
  const [first] = useState(() => load(win, readPickedSync())); // painted at once; the first refresh replaces it
  const shown = useRef(first);
  const [sel, setSel] = useState("all"); // only the selected row gets a chart: building one per app would be 90+ SVGs

  // Same sampling as the menu bar command, so this stays live even if background refresh is off.
  const { data, revalidate, isLoading } = usePromise(
    async (m: number) => {
      const next = load(m, await tick());
      if (viewSig(shown.current) !== viewSig(next) || shown.current.win !== m) shown.current = next; // same data: same object, no redraw
      return shown.current;
    },
    [win],
  );
  useEffect(() => {
    const timer = setInterval(revalidate, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);
  const v = data ?? first;

  const agg = v.aggs[win];
  const inWin = v.all.filter((s) => s.t >= v.now - win * MIN);
  const total = agg.inB + agg.outB;
  const [unIn, unOut] = unattr(agg);
  const chart = (id: string, pick: (s: Sample) => [number, number]) =>
    sel === id ? chartMarkdown(inWin, v.now, win, pick) : "";
  const share = (n: number) => `${total ? Math.round((n / total) * 100) : 0}%`;

  return (
    <List
      isLoading={isLoading && !data}
      isShowingDetail
      searchBarPlaceholder="Filter apps"
      onSelectionChange={(id) => id && setSel(id)}
      searchBarAccessory={
        <List.Dropdown tooltip="Window" value={String(win)} onChange={(x) => setWin(Number(x))}>
          {WINDOWS.map((m) => (
            <List.Dropdown.Item key={m} title={`Last ${winLabel(m)}`} value={String(m)} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Summary" subtitle={`counting ${COUNTING[v.filter.mode]}`}>
        <List.Item
          id="all"
          title="All Traffic"
          icon={Icon.BarChart}
          accessories={[{ text: fmt(total) }]}
          detail={
            <List.Item.Detail
              markdown={`### Last ${winLabel(win)} on ${v.nets[v.net]?.label ?? "this network"}\n${chart("all", (s) => [s.inB, s.outB])}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Download" text={fmt(agg.inB)} icon={Icon.ArrowDown} />
                  <List.Item.Detail.Metadata.Label title="Upload" text={fmt(agg.outB)} icon={Icon.ArrowUp} />
                  <List.Item.Detail.Metadata.Label title="Total" text={fmt(total)} />
                  <List.Item.Detail.Metadata.Label title="Attributed to Apps" text={share(agg.attIn + agg.attOut)} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Summary"
                content={`Last ${winLabel(win)}: ${bytes2(agg.inB, agg.outB)} = ${fmt(total)}`}
              />
            </ActionPanel>
          }
        />
        <List.Item
          id="unattributed"
          title="Unattributed"
          icon={Icon.QuestionMark}
          accessories={[{ text: fmt(unIn + unOut) }]}
          detail={
            <List.Item.Detail
              markdown={`### Unattributed\n${UNATTRIBUTED}\n\n${chart("unattributed", unattrPick)}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Download" text={fmt(unIn)} icon={Icon.ArrowDown} />
                  <List.Item.Detail.Metadata.Label title="Upload" text={fmt(unOut)} icon={Icon.ArrowUp} />
                  <List.Item.Detail.Metadata.Label title="Share of Window" text={share(unIn + unOut)} />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      </List.Section>
      <List.Section title="Apps" subtitle={String(agg.apps.length)}>
        {agg.apps.map((app) => {
          const id = `app:${app.label}`;
          const sum = app.inB + app.outB;
          const name = displayName(app.label);
          const hosts = Object.entries(app.hosts)
            .sort((x, y) => y[1] - x[1])
            .slice(0, 5);
          const tc = Object.entries(app.tc).sort((x, y) => y[1] - x[1])[0]?.[0];
          const path = v.paths[app.label];
          const setting = SETTINGS[app.label];
          const about = SERVICES[app.label];
          return (
            <List.Item
              key={id}
              id={id}
              title={name}
              keywords={[app.label]}
              icon={path ? { fileIcon: path } : Icon.Terminal}
              accessories={[{ text: fmt(sum) }]}
              detail={
                <List.Item.Detail
                  markdown={`### ${name}\n${about ? `${about}\n\n` : ""}${chart(id, appPick(app.label))}`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Download" text={fmt(app.inB)} icon={Icon.ArrowDown} />
                      <List.Item.Detail.Metadata.Label title="Upload" text={fmt(app.outB)} icon={Icon.ArrowUp} />
                      <List.Item.Detail.Metadata.Label title="Share of Window" text={share(sum)} />
                      {app.retx > 0 && (
                        <List.Item.Detail.Metadata.Label
                          title="Retransmitted (TCP)"
                          text={`${fmt(app.retx)} · ${app.outB ? ((app.retx / app.outB) * 100).toFixed(1) : "0"}%`}
                        />
                      )}
                      {tc && <List.Item.Detail.Metadata.Label title="Traffic Class" text={TC_LABEL[tc] ?? tc} />}
                      {app.tunIn + app.tunOut > 0 && (
                        <List.Item.Detail.Metadata.Label
                          title="Through VPN Tunnel"
                          text={bytes2(app.tunIn, app.tunOut)}
                        />
                      )}
                      {name !== app.label && <List.Item.Detail.Metadata.Label title="Process" text={app.label} />}
                      {hosts.length > 0 && <List.Item.Detail.Metadata.Separator />}
                      {hosts.map(([ip, b]) => (
                        <List.Item.Detail.Metadata.Label
                          key={ip}
                          title={hostLabel(ip)}
                          text={fmt(b)}
                          icon={Icon.Globe}
                        />
                      ))}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Summary"
                    content={`${name}: ${bytes2(app.inB, app.outB)} in the last ${winLabel(win)}`}
                  />
                  {setting && <Action title={setting.title} icon={Icon.Gear} onAction={() => open(setting.url)} />}
                  {path && <Action.ShowInFinder path={path} />}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {v.events.length > 0 && (
        <List.Section title="Spikes">
          {[...v.events].reverse().map((e) => (
            <List.Item
              key={e.start}
              title={`${clock(e.start)}  ${displayName(e.app)}`}
              icon={Icon.Bolt}
              accessories={[{ text: fmt(e.bytes) }]}
              detail={
                <List.Item.Detail
                  markdown={`${fmt(e.bytes)} over ${Math.round((e.end - e.start) / MIN)} min, mostly **${displayName(e.app)}**.`}
                />
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
