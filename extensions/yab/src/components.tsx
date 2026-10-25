import {
  Action,
  ActionPanel,
  closeMainWindow,
  Color,
  getPreferenceValues,
  Icon,
  Image,
  Keyboard,
  List,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { bundleID, faviconFile, isSymbol } from "./data";
import {
  closeTab,
  newPrivateWindow,
  newWindow,
  openSmallWindow,
  openTabFor,
  openURL,
  readWindow,
  reloadTab,
  selectTab,
  Space,
  Tab,
} from "./yab";

export function prefs() {
  return getPreferenceValues<Preferences>();
}

// MARK: - looks

export function favicon(url: string): Image.ImageLike {
  const local = faviconFile(url);
  return local
    ? { source: local, mask: Image.Mask.RoundedRectangle }
    : getFavicon(url, { mask: Image.Mask.RoundedRectangle, fallback: Icon.Globe });
}

function hsl(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = ((n >> 16) & 255) / 255,
    g = ((n >> 8) & 255) / 255,
    b = (n & 255) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

/**
 * A space's color, kept readable as a tag's text: darker on a light
 * Raycast, lighter on a dark one. A pale "F2E9E3" as is would vanish.
 */
export function spaceColor(hex?: string): Color.ColorLike | undefined {
  if (!hex || !/^#?[0-9a-f]{6}$/i.test(hex)) return undefined;
  const [h, s, l] = hsl(hex);
  const sat = Math.max(s, 0.25) * 100;
  return {
    light: `hsl(${h.toFixed(0)}, ${sat.toFixed(0)}%, ${(Math.min(l, 0.4) * 100).toFixed(0)}%)`,
    dark: `hsl(${h.toFixed(0)}, ${sat.toFixed(0)}%, ${(Math.max(l, 0.72) * 100).toFixed(0)}%)`,
  };
}

export function spaceIcon(space: { icon: string; color?: string }): Image.ImageLike {
  if (space.icon && !isSymbol(space.icon)) return space.icon;
  return { source: Icon.CircleFilled, tintColor: spaceColor(space.color) ?? Color.SecondaryText };
}

export function spaceLabel(space: { icon: string; title: string }): string {
  return space.icon && !isSymbol(space.icon) ? `${space.icon} ${space.title}` : space.title;
}

export function when(date: Date | number | undefined): string {
  if (date === undefined) return "";
  const d = typeof date === "number" ? new Date(date * 1000) : date;
  const now = new Date();
  const days = Math.floor((startOfDay(now) - startOfDay(d)) / 86400000);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (days === 0) return time;
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: days > 300 ? "numeric" : undefined });
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// MARK: - data

/**
 * The front window's tabs and spaces, kept between openings so the list
 * shows at once. Lists about tabs open Yab; the others (history, bookmarks)
 * only want to know what is open and leave a closed Yab closed.
 */
export function useYabWindow({ launch = true }: { launch?: boolean } = {}) {
  return useCachedPromise((open: boolean) => readWindow({ launch: open }), [launch], {
    keepPreviousData: true,
    failureToastOptions: { title: "Couldn't read Yab's tabs" },
  });
}

/** macOS hasn't let Raycast tell Yab what to do (-1743). */
export function isAutomationDenied(error: unknown): boolean {
  const text = String((error as Error)?.message ?? error);
  return text.includes("-1743") || text.includes("Not authorized");
}

export function AutomationEmptyView() {
  return (
    <List.EmptyView
      icon={Icon.Lock}
      title="Raycast can't reach Yab yet"
      description="Allow Raycast to control Yab in System Settings › Privacy & Security › Automation."
      actions={
        <ActionPanel>
          <Action.Open
            title="Open Automation Settings"
            target="x-apple.systempreferences:com.apple.preference.security?Privacy_Automation"
          />
        </ActionPanel>
      }
    />
  );
}

export async function attempt(title: string, work: () => Promise<unknown>, close = true) {
  try {
    await work();
    if (close) await closeMainWindow({ clearRootSearch: true });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title,
      message: isAutomationDenied(error)
        ? "Allow Raycast to control Yab in Privacy & Security › Automation"
        : String(error),
    });
  }
}

// MARK: - actions

/**
 * Opening a page: the open tab if there is one, else a new tab or the
 * Small Window (the preference picks ↵, ⌘↵ does the other), then windows
 * and copying.
 */
export function OpenActions(props: { url: string; title?: string; tabs?: Tab[]; extra?: React.ReactNode }) {
  const { url, title } = props;
  const open = openTabFor(props.tabs, url);
  const smallFirst = prefs().primary === "small";
  const tab = (
    <Action
      key="tab"
      title="Open in New Tab"
      icon={Icon.Plus}
      onAction={() => attempt("Couldn't open the page", () => openURL(url, "tab"))}
    />
  );
  const small = (
    <Action
      key="small"
      title="Open in Small Window"
      icon={Icon.AppWindow}
      onAction={() => attempt("Couldn't open the Small Window", () => openSmallWindow(url))}
    />
  );
  return (
    <>
      <ActionPanel.Section>
        {open ? (
          <Action
            title="Switch to Tab"
            icon={Icon.Switch}
            onAction={() => attempt("Couldn't switch to the tab", () => selectTab(open.id))}
          />
        ) : null}
        {smallFirst ? [small, tab] : [tab, small]}
        <Action
          title="Open in New Window"
          icon={Icon.Window}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          onAction={() => attempt("Couldn't open a window", () => newWindow({ url }))}
        />
        <Action
          title="Open in Private Window"
          icon={Icon.EyeDisabled}
          shortcut={{ modifiers: ["cmd", "opt", "shift"], key: "enter" }}
          onAction={() => attempt("Couldn't open a private window", () => newPrivateWindow(url))}
        />
        {props.extra}
      </ActionPanel.Section>
      <CopyActions url={url} title={title} />
    </>
  );
}

export function CopyActions({ url, title }: { url: string; title?: string }) {
  return (
    <ActionPanel.Section>
      <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
      <Action.CopyToClipboard
        title="Copy as Markdown Link"
        content={`[${(title || url).replace(/[[\]]/g, "")}](${url})`}
        shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
      />
      <Action.CreateQuicklink
        quicklink={{ link: url, name: title, application: bundleID() }}
        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
      />
    </ActionPanel.Section>
  );
}

export function TabActions(props: { tab: Tab; tabs: Tab[]; onChange: () => void }) {
  const { tab, tabs, onChange } = props;
  const copies = tabs.filter((t) => t.id !== tab.id && t.url === tab.url && t.location === "unpinned");
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title="Switch to Tab"
          icon={Icon.Switch}
          onAction={() => attempt("Couldn't switch to the tab", () => selectTab(tab.id))}
        />
        <Action
          title="Open in Small Window"
          icon={Icon.AppWindow}
          onAction={() => attempt("Couldn't open the Small Window", () => openSmallWindow(tab.url))}
        />
      </ActionPanel.Section>
      <CopyActions url={tab.url} title={tab.title} />
      <ActionPanel.Section>
        <Action
          title="Reload"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => attempt("Couldn't reload", () => reloadTab(tab.id), false)}
        />
        <Action
          title="Close Tab"
          icon={Icon.XMarkCircle}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={async () => {
            await attempt("Couldn't close the tab", () => closeTab(tab.id), false);
            onChange();
          }}
        />
        {copies.length > 0 ? (
          <Action
            title={`Close ${copies.length === 1 ? "Its Copy" : `Its ${copies.length} Copies`}`}
            icon={Icon.Layers}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.RemoveAll}
            onAction={async () => {
              await attempt(
                "Couldn't close the copies",
                async () => {
                  for (const c of copies) await closeTab(c.id);
                },
                false,
              );
              await showToast({ style: Toast.Style.Success, title: `Closed ${copies.length}` });
              onChange();
            }}
          />
        ) : null}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

export function locationLabel(tab: Tab): List.Item.Accessory | undefined {
  if (tab.location === "topApp") return { icon: { source: Icon.Tack, tintColor: Color.SecondaryText }, tooltip: "Pin" };
  if (tab.location === "pinned")
    return { icon: { source: Icon.Bookmark, tintColor: Color.SecondaryText }, tooltip: "Kept" };
  return undefined;
}

export function TabItem(props: { tab: Tab; tabs: Tab[]; showSpace: boolean; spaces: Space[]; onChange: () => void }) {
  const { tab, tabs, showSpace, spaces, onChange } = props;
  const space = spaces.find((s) => s.id === tab.spaceId);
  const accessories: List.Item.Accessory[] = [];
  const mark = locationLabel(tab);
  if (tab.active) accessories.push({ tag: { value: "In Front", color: Color.Blue } });
  if (mark) accessories.push(mark);
  if (showSpace && space) accessories.push({ tag: { value: spaceLabel(space), color: spaceColor(space.color) } });
  let host = "";
  try {
    host = new URL(tab.url).hostname.replace(/^www\./, "");
  } catch {
    host = tab.url;
  }
  return (
    <List.Item
      id={tab.id}
      icon={favicon(tab.url)}
      title={tab.title || host}
      subtitle={{ value: host, tooltip: tab.url }}
      keywords={[tab.url, host, space?.title ?? ""]}
      accessories={accessories}
      actions={<TabActions tab={tab} tabs={tabs} onChange={onChange} />}
    />
  );
}

export function openInFinderAction(path: string) {
  return <Action.ShowInFinder path={path} />;
}

export { open };
