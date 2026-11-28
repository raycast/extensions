import { shares } from "./layouts.ts";

// What part each window plays in someone's work, and where Smart Arrange puts it. No Raycast in here.

/**
 * `work` is what you are making. `reference` is what you read while making it. `comms` is people.
 * `background` is what runs alongside: music, settings, monitors.
 */
export type Role = "work" | "reference" | "comms" | "background";

/** macOS app categories, as apps declare them in `LSApplicationCategoryType`, without the prefix. */
const BY_CATEGORY: Record<string, Role> = {
  "developer-tools": "work",
  "graphics-design": "work",
  photography: "work",
  video: "work",
  productivity: "work",
  business: "work",
  finance: "work",
  education: "reference",
  reference: "reference",
  news: "reference",
  books: "reference",
  medical: "reference",
  "social-networking": "comms",
  music: "background",
  entertainment: "background",
  utilities: "background",
  weather: "background",
  lifestyle: "background",
  "healthcare-fitness": "background",
  travel: "background",
  sports: "background",
};

/**
 * Well-known apps whose category is missing, too broad or misleading. Browsers and mail call themselves
 * "productivity", Slack "business", Terminal "utilities".
 */
const BY_APP: Record<string, Role> = {
  // Browsers
  "com.apple.Safari": "reference",
  "com.google.Chrome": "reference",
  "company.thebrowser.Browser": "reference",
  "company.thebrowser.dia": "reference",
  "org.mozilla.firefox": "reference",
  "com.microsoft.edgemac": "reference",
  "com.brave.Browser": "reference",
  "com.vivaldi.Vivaldi": "reference",
  "com.operasoftware.Opera": "reference",
  "com.kagi.kagimacOS": "reference",
  "app.zen-browser.zen": "reference",
  // Reading and notes
  "com.apple.Preview": "reference",
  "com.apple.finder": "reference",
  "com.apple.Notes": "reference",
  "com.apple.iBooksX": "reference",
  "notion.id": "reference",
  "md.obsidian": "reference",
  // Terminals
  "com.apple.Terminal": "work",
  "com.googlecode.iterm2": "work",
  "dev.warp.Warp-Stable": "work",
  "net.kovidgoyal.kitty": "work",
  "org.alacritty": "work",
  // Mail, chat and calls
  "com.apple.mail": "comms",
  "com.apple.MobileSMS": "comms",
  "com.apple.FaceTime": "comms",
  "com.tinyspeck.slackmacgap": "comms",
  "com.microsoft.teams2": "comms",
  "com.microsoft.Outlook": "comms",
  "us.zoom.xos": "comms",
  "ru.keepcoder.Telegram": "comms",
  "org.whispersystems.signal-desktop": "comms",
  "com.readdle.smartemail-Mac": "comms",
  "com.superhuman.electron": "comms",
  "com.mimestream.Mimestream": "comms",
  "com.facebook.archon": "comms",
  // Alongside
  "com.apple.iCal": "background",
  "com.apple.reminders": "background",
  "com.apple.systempreferences": "background",
  "com.apple.ActivityMonitor": "background",
  "com.apple.podcasts": "background",
};

/** Raycast's own windows, by title. */
const RAYCAST = "com.raycast.macos";
const BY_RAYCAST_WINDOW: Record<string, Role> = { "AI Chat": "reference", Notes: "reference", Settings: "background" };

/** An app nobody has heard of is treated as work, so it is tiled like any other window. */
export function roleOf(app: { bundleId?: string; category?: string; title?: string }): Role {
  if (app.bundleId === RAYCAST) return BY_RAYCAST_WINDOW[app.title ?? ""] ?? "background";
  const known = app.bundleId && BY_APP[app.bundleId];
  if (known) return known;
  return BY_CATEGORY[(app.category ?? "").replace("public.app-category.", "")] ?? "work";
}

export type Arrangeable = { id: string; app: string; display: number; focused: boolean; role: Role };
/** Whether these windows, in this order and layout, fit on a display at sizes their apps accept. */
export type Fits = (display: number, ids: string[], layout: DisplayPlan["layout"]) => boolean;
export type DisplayPlan = { display: number; layout: "auto-tile" | "master-left"; windows: string[] };

const ORDER: Role[] = ["work", "reference", "comms", "background"];

/**
 * Where Smart Arrange puts everything. The focused window leads the largest display, with the rest of the
 * work and what you read beside it. People and background apps start on the other displays. Then every
 * display is filled to its share by size, so none sits empty while another is crowded: the largest gives up
 * what matters least, the others what matters most. Windows of one app stay next to each other.
 */
export function smartPlan(
  windows: Arrangeable[],
  displays: { index: number; width: number; height: number }[],
  fits: Fits = () => true,
): DisplayPlan[] {
  if (!displays.length) return [];
  const byImportance = (a: Arrangeable, b: Arrangeable) =>
    Number(b.focused) - Number(a.focused) ||
    ORDER.indexOf(a.role) - ORDER.indexOf(b.role) ||
    a.app.localeCompare(b.app);
  const [main, ...others] = [...displays].sort((a, b) => b.width * b.height - a.width * a.height);
  const on = new Map<number, Arrangeable[]>(displays.map((d) => [d.index, []]));
  const side = (role: Role) => role === "comms" || role === "background";

  for (const w of [...windows].sort(byImportance)) {
    const beside = others.length && side(w.role) && !w.focused;
    // Side windows fill the other displays in turn, emptiest first
    const to = beside ? [...others].sort((a, b) => on.get(a.index)!.length - on.get(b.index)!.length)[0] : main;
    on.get(to.index)!.push(w);
  }

  const target = new Map(shares(windows.length, displays).map((n, k) => [displays[k].index, n]));
  const spare = (d: { index: number }) => target.get(d.index)! - on.get(d.index)!.length;
  for (let guard = 0; guard < windows.length; guard++) {
    const [from] = [...displays].sort((a, b) => spare(a) - spare(b));
    const [to] = [...displays].sort((a, b) => spare(b) - spare(a));
    if (spare(from) >= 0 || spare(to) <= 0) break;
    const list = on.get(from.index)!;
    // The focused window never leaves the main display
    const give = from === main ? list.length - 1 : list.findIndex((w) => !w.focused);
    if (give < 0 || list[give].focused) break;
    const [w] = list.splice(give, 1);
    const dest = on.get(to.index)!;
    dest.push(w);
    dest.sort(byImportance);
  }

  const layoutOf = (d: { index: number }, list: Arrangeable[]): DisplayPlan["layout"] =>
    d === main && list.length > 1 && (list[0].focused || list[0].role === "work") ? "master-left" : "auto-tile";
  const ok = (d: { index: number }, list: Arrangeable[]) =>
    list.length < 2 ||
    fits(
      d.index,
      list.map((w) => w.id),
      layoutOf(d, list),
    );
  const sorted = (list: Arrangeable[]) => [...list].sort(byImportance);

  // Two windows that can't share a display, like two that are both too wide, would end up on top of each
  // other. One of them trades places with a window from another display that does fit.
  for (let guard = 0; guard < windows.length; guard++) {
    const from = displays.find((d) => !ok(d, on.get(d.index)!));
    if (!from) break;
    const list = on.get(from.index)!;
    // Least important first. It trades places with the least important window elsewhere, provided both
    // displays then fit. Failing a trade, it just moves, if the other display can take it.
    const leaving = sorted(list)
      .filter((w) => !w.focused)
      .reverse();
    const moves = leaving.flatMap((w) =>
      displays
        .filter((d) => d !== from)
        .flatMap((to) => {
          const there = on.get(to.index)!;
          const rest = list.filter((x) => x !== w);
          const backs: (Arrangeable | undefined)[] = [
            ...sorted(there)
              .filter((c) => !c.focused)
              .reverse(),
            undefined,
          ];
          return backs.map((back) => ({
            to,
            here: sorted(back ? [...rest, back] : rest),
            there: sorted([...there.filter((x) => x !== back), w]),
          }));
        }),
    );
    const move = moves.find((m) => ok(from, m.here) && ok(m.to, m.there));
    if (!move) break;
    on.set(from.index, move.here);
    on.set(move.to.index, move.there);
  }

  return displays.map((d) => {
    const list = on.get(d.index)!;
    return { display: d.index, layout: layoutOf(d, list), windows: list.map((w) => w.id) };
  });
}
