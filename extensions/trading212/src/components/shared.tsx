import { Action, Icon, Keyboard } from "@raycast/api";

export const TRADING212_URL = "https://app.trading212.com";
export const COPY_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "c" };
export const HISTORY_CHART_HEIGHT = 170;

export function OpenInTrading212Action() {
  return <Action.OpenInBrowser title="Open in Trading 212" url={TRADING212_URL} />;
}

/** `second`: it's the panel's second action, which Raycast binds to ⌘↵ and shows no custom shortcut for. */
export function RefreshAction({ onRefresh, second = false }: { onRefresh: () => void; second?: boolean }) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={second ? undefined : Keyboard.Shortcut.Common.Refresh}
      onAction={onRefresh}
    />
  );
}

/** "Nov 5, 2026"; `utc` for date-only API values (dividend pay dates) so they don't shift a day. */
export function formatDate(iso: string, opts: { time?: boolean; utc?: boolean } = {}): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const tz = opts.utc ? { timeZone: "UTC" } : {};
  const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", ...tz }).format(date);
  if (!opts.time) return day;
  const time = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", ...tz }).format(
    date,
  );
  return `${day} · ${time}`;
}
