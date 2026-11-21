import {
  Cache,
  Clipboard,
  Icon,
  Keyboard,
  LaunchType,
  MenuBarExtra,
  environment,
  getPreferenceValues,
  launchCommand,
  open,
  openCommandPreferences,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { IPCHECK_URL } from "./lib/constants";
import { countryCodeToFlagEmoji, countryName } from "./lib/geo";
import { findSource, fetchFromSource } from "./lib/sources";

// Options live in Raycast's command preferences. Preference keys get RENAMED, never edited,
// whenever their stored values could conflict with a changed definition: Raycast (v2 beta)
// wedges on a dropdown whose stored value no longer matches its option list — including
// adding options to an existing dropdown. Dead keys, never to be reused: menuBarSource,
// menuBarTitle, refreshInterval, notifyOnChange, ipSource, notifyOnIpChange.

type LabelStyle = Preferences.Menubar["labelStyle"];

/** Everything one check produced — also the last known answer remembered between runs. */
interface CheckResult {
  sourceId: string;
  sourceLabel: string;
  checkedAt: number;
  ip?: string;
  countryCode?: string;
  error?: string;
}

const store = new Cache({ namespace: "menubar" });

/**
 * Set by the Refresh menu item just before it revalidates, and consumed by the very next
 * check in the same process. Only bridges those few microseconds.
 */
let refreshRequested = false;

export default function Command() {
  // Read at render time, not at module load, so a reused process picks up preference
  // changes on its next render rather than keeping the values it started with.
  const preferences = getPreferenceValues<Preferences.Menubar>();

  const { data, isLoading, revalidate } = useCachedPromise(checkIP, [preferences.preferredSource], {
    // On a source switch, show the loading state rather than the old source's address.
    keepPreviousData: false,
  });

  const flag = data?.countryCode ? countryCodeToFlagEmoji(data.countryCode) : "";

  return (
    <MenuBarExtra
      icon={data?.error && !data.ip ? Icon.WifiDisabled : Icon.Globe}
      title={menuBarTitle(data, flag, preferences)}
      tooltip="Your external IP"
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title={data?.sourceLabel ?? "IPCheck"}>
        {data?.ip && (
          <MenuBarExtra.Item
            icon={Icon.Globe}
            title={data.ip}
            subtitle={[flag, countryName(data.countryCode)].filter(Boolean).join(" ") || undefined}
            tooltip="Copy to clipboard"
            onAction={async () => {
              await Clipboard.copy(data.ip ?? "");
              await showHUD("Copied IP to clipboard");
            }}
          />
        )}
        {data?.error && <MenuBarExtra.Item icon={Icon.Warning} title={data.error} />}
        {data && data.checkedAt > 0 && (
          <MenuBarExtra.Item icon={Icon.Clock} title={`Checked at ${formatTime(data.checkedAt)}`} />
        )}
        {!data && <MenuBarExtra.Item icon={Icon.Clock} title="Looking up your IP…" />}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.ArrowClockwise}
          title="Refresh"
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={async () => {
            refreshRequested = true;
            // Awaited so the process stays alive until the fetch lands and re-renders.
            await revalidate();
          }}
        />
        <MenuBarExtra.Item
          icon={Icon.List}
          title="Show All My IPs"
          onAction={() => launchCommand({ name: "main", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          icon={Icon.MagnifyingGlass}
          title="Query an IP"
          onAction={() => launchCommand({ name: "query-ip", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item icon={Icon.Link} title="Get More Tests" onAction={() => open(IPCHECK_URL)} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        {/* No shortcut: ⌘, is reserved by Raycast for its own preferences action. */}
        <MenuBarExtra.Item icon={Icon.Gear} title="Configure Command" onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

async function checkIP(sourceId: string): Promise<CheckResult> {
  const forced = refreshRequested;
  refreshRequested = false;

  const source = findSource(sourceId);

  // Never silently substitute another source: an id this build doesn't know means either a
  // stale bundle or a wedged preference, and both must be visible, not papered over.
  if (!source) {
    return {
      sourceId,
      sourceLabel: "IPCheck",
      checkedAt: 0,
      error: `Unknown IP source "${sourceId}" — rebuild the extension or re-select the source`,
    };
  }
  // Read here as well: this function runs on every check, so even a stale component render
  // cannot feed it an outdated interval setting.
  const preferences = getPreferenceValues<Preferences.Menubar>();
  const last = readLast(source.id);

  // The refresh interval paces only the scheduled background relaunches. Every
  // user-triggered run — opening the menu, Refresh, enabling the command — hits the network.
  if (!forced && environment.launchType === LaunchType.Background && last) {
    const intervalMs = Number(preferences.refreshEvery) * 60_000;
    if (Date.now() - last.checkedAt < intervalMs) {
      return last;
    }
  }

  const { entry, failure } = await fetchFromSource(source);

  if (!entry) {
    // Keep the last known IP of this source on screen next to the failure. Not persisted,
    // so background pacing stays anchored to the last *successful* check.
    return {
      ...(last ?? {}),
      sourceId: source.id,
      sourceLabel: source.label,
      checkedAt: last?.checkedAt ?? 0,
      error: failure?.message ?? "Could not determine your IP",
    };
  }

  const result: CheckResult = {
    sourceId: source.id,
    sourceLabel: source.label,
    checkedAt: Date.now(),
    ip: entry.ip,
    countryCode: entry.countryCode,
  };

  writeLast(result);
  return result;
}

/** Last successful check, kept per source so switching sources never mixes addresses. */
function readLast(sourceId: string): CheckResult | undefined {
  const raw = store.get(`last:${sourceId}`);
  if (raw === undefined) return undefined;

  try {
    return JSON.parse(raw) as CheckResult;
  } catch {
    store.remove(`last:${sourceId}`);
    return undefined;
  }
}

function writeLast(result: CheckResult): void {
  store.set(`last:${result.sourceId}`, JSON.stringify(result));
}

const TITLE_STYLES: Record<LabelStyle, (ip: string, flag: string) => string | undefined> = {
  flagAndIp: (ip, flag) => [flag, ip].filter(Boolean).join(" "),
  flag: (_ip, flag) => flag || undefined,
  ip: (ip) => ip,
  hidden: () => undefined,
};

function menuBarTitle(
  data: CheckResult | undefined,
  flag: string,
  preferences: Preferences.Menubar,
): string | undefined {
  if (!data?.ip) return undefined;

  // Only the bar label is shortened — the menu item and the copy action keep the full
  // address, since the label is a glance and the menu is where the real value lives.
  const ip = preferences.compactIPv6 ? shortenIPv6(data.ip) : data.ip;

  // Looked up rather than switched on, so an unrecognized setting degrades to the bare IP
  // instead of silently rendering the default style.
  const render = TITLE_STYLES[preferences.labelStyle];
  return render ? render(ip, flag) : ip;
}

/** "2408:8207:246d:e0:…" → "2408:8207:…". IPv4 and unusual v6 forms pass through as is. */
function shortenIPv6(ip: string): string {
  if (!ip.includes(":")) return ip;

  const groups = ip.split(":");
  // Global unicast always has two leading hextets; anything else (e.g. "::1") stays full.
  if (!groups[0] || !groups[1]) return ip;

  return `${groups[0]}:${groups[1]}:…`;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
