import {
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  environment,
  launchCommand,
  open,
  openCommandPreferences,
  showHUD,
  showInFinder,
} from "@raycast/api";
import type { Image } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";
import {
  dir,
  load,
  pinWindow,
  readPickedSync,
  readPinned,
  readPinnedSync,
  rememberBarWindow,
  savePicked,
  tick,
} from "./data.ts";
import { buildBar, buildMenu } from "./menu.ts";
import type { Bar, Do, Ic, Icon as NodeIcon, Node } from "./menu.ts";
import { captureState, requestAction, requestCapture } from "./sample.ts";
import type { Action } from "./sample.ts";

const FIRST_REFRESH_MS = 1500; // let the menu finish opening before any work happens
const REFRESH_MS = 5000;
const OPEN_GAP_MS = 4000; // an open menu does not sample again if a round just ran

const ICONS: Record<Ic, Image.ImageLike> = {
  network: Icon.Network,
  mobile: Icon.Mobile,
  wifi: Icon.Wifi,
  chart: Icon.BarChart,
  clock: Icon.Clock,
  bolt: Icon.Bolt,
  stopwatch: Icon.Stopwatch,
  window: Icon.AppWindowSidebarRight,
  gear: Icon.Gear,
  eye: Icon.Eye,
  undo: Icon.Undo,
  reset: Icon.ArrowCounterClockwise,
  trash: Icon.Trash,
  pin: Icon.Pin,
  question: Icon.QuestionMark,
  terminal: Icon.Terminal,
  list: Icon.List,
};

const HUD: Record<Action, string> = { reset: "Total reset", clear: "All history cleared", undo: "Undone" };

async function act(a: Action) {
  requestAction(dir, a);
  await tick(0);
  await showHUD(HUD[a]);
}

const RUN: { [K in Do["do"]]: (d: Extract<Do, { do: K }>, stored: Set<string>) => void | Promise<void> } = {
  act: (d) => act(d.a),
  capture: () => requestCapture(dir),
  open: (d) => open(d.url),
  finder: (d) => showInFinder(d.path),
  pin: (d) => pinWindow(d.win),
  toggle: (d, stored) => {
    const next = new Set(stored);
    if (!next.delete(d.id)) next.add(d.id);
    return savePicked(next);
  },
  details: (d) =>
    launchCommand({
      name: "details",
      type: LaunchType.UserInitiated,
      context: d.win ? { window: d.win } : undefined,
    }),
  prefs: () => openCommandPreferences(),
};

const iconOf = (i?: NodeIcon): Image.ImageLike | undefined =>
  i ? (typeof i === "string" ? ICONS[i] : { fileIcon: i.file }) : undefined;

function render(nodes: Node[], stored: Set<string>, path = ""): ReactElement[] {
  return nodes.map((n, i) => {
    const key = `${path}/${i}`;
    if (n.k === "item") {
      const run = n.run && (() => (RUN[n.run!.do] as (d: Do, s: Set<string>) => void | Promise<void>)(n.run!, stored));
      return (
        <MenuBarExtra.Item
          key={key}
          title={n.title}
          subtitle={n.subtitle}
          tooltip={n.tooltip}
          icon={iconOf(n.icon)}
          onAction={run}
        />
      );
    }
    if (n.k === "sub")
      return (
        <MenuBarExtra.Submenu key={key} title={n.title} icon={iconOf(n.icon)}>
          {render(n.children, stored, key)}
        </MenuBarExtra.Submenu>
      );
    return (
      <MenuBarExtra.Section key={key} title={n.title}>
        {render(n.children, stored, key)}
      </MenuBarExtra.Section>
    );
  });
}

// Everything a render needs, computed outside React so the same frame is not rebuilt when nothing changed.
type Frame = { sig: string; bar: Bar; nodes: Node[]; stored: Set<string> };

function frame(pinned: number | undefined, full: boolean, stored: Set<string>): Frame {
  const v = load(pinned, full, stored);
  rememberBarWindow(v.win);
  const bar = buildBar(v);
  const nodes = full ? buildMenu(v, captureState(dir)) : [];
  return { sig: JSON.stringify([bar, nodes, [...stored]]), bar, nodes, stored };
}

export default function Command() {
  const full = environment.launchType === LaunchType.UserInitiated;
  // The last known numbers are on screen at once (title included); fresh ones follow after the menu has opened.
  const [f, setF] = useState(() => frame(readPinnedSync(), full, readPickedSync()));
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = async () => {
      try {
        const stored = await tick(full ? OPEN_GAP_MS : undefined);
        const next = frame(await readPinned(), full, stored);
        if (alive) setF((cur) => (cur.sig === next.sig ? cur : next));
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setBusy(false);
      }
      if (alive && full) timer = setTimeout(refresh, REFRESH_MS);
    };
    timer = setTimeout(refresh, full ? FIRST_REFRESH_MS : 0);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  const children = useMemo(() => render(f.nodes, f.stored), [f.sig]);
  const { bar } = f;
  const tint = bar.tint === "red" ? Color.Red : bar.tint === "orange" ? Color.Orange : undefined;

  return (
    <MenuBarExtra
      isLoading={busy && !full}
      icon={{ source: bar.hs ? Icon.Mobile : Icon.Network, tintColor: tint }}
      title={bar.title}
      tooltip={bar.tooltip}
    >
      {children}
    </MenuBarExtra>
  );
}
