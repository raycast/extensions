import {
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listObjects, MyMindApiError, MyMindObject } from "./api";

const MYMIND_WEB_URL = "https://access.mymind.com/everything";
const MAX_VISIBLE = 8;
const MAX_TITLE_CHARS = 40;

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function hostnameOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d >= startOfToday();
}

function todaysSaves(objects: MyMindObject[]): MyMindObject[] {
  return objects.filter((o) => isToday(o.created)).sort((a, b) => b.created.localeCompare(a.created));
}

export default function Command() {
  const {
    isLoading,
    data: objects = [],
    error,
  } = useCachedPromise(async () => {
    try {
      return await listObjects({ limit: 200 });
    } catch (err) {
      if (err instanceof MyMindApiError && err.isUnauthorized) {
        return [];
      }
      throw err;
    }
  });

  const items = todaysSaves(objects).slice(0, MAX_VISIBLE);
  const total = todaysSaves(objects).length;
  const tooltip = error ? "mymind — error" : `mymind — ${total} saved today`;

  return (
    <MenuBarExtra
      icon="mymind-logo.svg"
      title={total > 0 ? String(total) : undefined}
      tooltip={tooltip}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title={total === 0 ? "Nothing saved today" : `Today (${total})`}>
        {items.map((o) => (
          <MenuBarExtra.Item
            key={o.id}
            title={truncate(o.title || "Untitled", MAX_TITLE_CHARS)}
            subtitle={hostnameOf(o.source?.url)}
            tooltip={o.source?.url ?? o.title ?? undefined}
            onAction={() => open(o.source?.url ?? `${MYMIND_WEB_URL}/#${o.id}`)}
          />
        ))}
        {total > items.length && (
          <MenuBarExtra.Item
            title={`+ ${total - items.length} more…`}
            icon={Icon.Ellipsis}
            onAction={() => launchCommand({ name: "search-my-mind", type: LaunchType.UserInitiated })}
          />
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Save to mymind…"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          onAction={async () => {
            try {
              await launchCommand({ name: "save-to-mymind", type: LaunchType.UserInitiated });
            } catch (err) {
              await showToast({
                style: Toast.Style.Failure,
                title: "Failed to open Save command",
                message: err instanceof Error ? err.message : String(err),
              });
            }
          }}
        />
        <MenuBarExtra.Item
          title="Search My Mind"
          icon={Icon.MagnifyingGlass}
          onAction={() => launchCommand({ name: "search-my-mind", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item title="Open mymind" icon={Icon.Globe} onAction={() => open(MYMIND_WEB_URL)} />
      </MenuBarExtra.Section>
      {error && (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Authentication error — open preferences"
            icon={Icon.ExclamationMark}
            onAction={openExtensionPreferences}
          />
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}
