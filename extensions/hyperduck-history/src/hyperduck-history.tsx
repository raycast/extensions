import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Icon,
  List,
  LocalStorage,
  open,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { getFavicon, usePromise } from "@raycast/utils";
import {
  createSerialQueue,
  displayTitle,
  HYPERDUCK_PLIST,
  HyperduckError,
  HyperduckLink,
  mergeLinks,
  readHyperduckHistory,
} from "./hyperduck";

const ARCHIVE_KEY = "archive";
const HIDDEN_KEY = "hidden";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Every read-modify-write of the saved list goes through this queue, so changes never overwrite each other. */
const withStorage = createSerialQueue();

interface LoadResult {
  enabled: boolean;
  links: HyperduckLink[];
  /** Ids still present in Hyperduck's own history. The rest exist only in this extension's archive. */
  liveIds: Set<string>;
}

async function readJsonArray(key: string): Promise<unknown[]> {
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

async function loadArchive(): Promise<HyperduckLink[]> {
  return (await readJsonArray(ARCHIVE_KEY))
    .map((item) => {
      const link = item as Partial<HyperduckLink>;
      return typeof link.id === "string" && typeof link.url === "string" && typeof link.date === "number"
        ? { id: link.id, url: link.url, date: link.date }
        : undefined;
    })
    .filter((link): link is HyperduckLink => link !== undefined);
}

async function loadHidden(): Promise<string[]> {
  return (await readJsonArray(HIDDEN_KEY)).filter((id): id is string => typeof id === "string");
}

async function load(): Promise<LoadResult> {
  const history = await readHyperduckHistory();
  const liveIds = new Set(history.links.map((link) => link.id));
  return withStorage(async () => {
    const [archive, hidden] = await Promise.all([loadArchive(), loadHidden()]);
    const links = mergeLinks(archive, history.links, hidden);
    // Hidden ids only matter while Hyperduck still lists them.
    const stillHidden = hidden.filter((id) => liveIds.has(id));
    await Promise.all([
      LocalStorage.setItem(ARCHIVE_KEY, JSON.stringify(links)),
      LocalStorage.setItem(HIDDEN_KEY, JSON.stringify(stillHidden)),
    ]);
    return { enabled: history.enabled, links, liveIds };
  });
}

function removeLink(link: HyperduckLink, isLive: boolean): Promise<void> {
  return withStorage(async () => {
    const [archive, hidden] = await Promise.all([loadArchive(), loadHidden()]);
    await LocalStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive.filter((item) => item.id !== link.id)));
    if (isLive && !hidden.includes(link.id)) {
      await LocalStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden, link.id]));
    }
  });
}

function clearLinks(liveIds: Iterable<string>): Promise<void> {
  return withStorage(async () => {
    await Promise.all([
      LocalStorage.setItem(ARCHIVE_KEY, JSON.stringify([])),
      LocalStorage.setItem(HIDDEN_KEY, JSON.stringify([...liveIds])),
    ]);
  });
}

function sectionTitle(date: number, now: Date): "Today" | "Last 7 Days" | "Older" {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (date >= startOfToday) return "Today";
  if (date >= startOfToday - 6 * DAY_MS) return "Last 7 Days";
  return "Older";
}

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(load, [], {
    failureToastOptions: { title: "Could not load Hyperduck history" },
  });

  async function hide(link: HyperduckLink) {
    const isLive = data?.liveIds.has(link.id) ?? false;
    const confirmed = await confirmAlert({
      title: "Remove this link from the list?",
      message: isLive
        ? "The link stays hidden here. Hyperduck's own history does not change."
        : "Hyperduck no longer has this link, so you cannot get it back.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await removeLink(link, isLive);
    await showToast({ style: Toast.Style.Success, title: "Removed from list" });
    revalidate();
  }

  async function clearAll() {
    const confirmed = await confirmAlert({
      title: "Clear the whole list?",
      message:
        "This removes every link from this list. Links that Hyperduck no longer has cannot come back. Hyperduck's own history does not change.",
      primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await clearLinks(data?.liveIds ?? []);
    await showToast({ style: Toast.Style.Success, title: "List cleared" });
    revalidate();
  }

  if (error) {
    const kind = error instanceof HyperduckError ? error.kind : "unreadable";
    return (
      <List>
        <List.EmptyView
          icon={kind === "denied" ? Icon.Lock : Icon.Warning}
          title={kind === "missing" ? "No Hyperduck history found" : "Could not read Hyperduck history"}
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
              {kind === "missing" ? null : <Action.ShowInFinder path={HYPERDUCK_PLIST} />}
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const now = new Date();
  const links = data?.links ?? [];
  const sections = new Map<string, HyperduckLink[]>();
  for (const link of links) {
    const title = sectionTitle(link.date, now);
    sections.set(title, [...(sections.get(title) ?? []), link]);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search links sent with Hyperduck">
      {data && !data.enabled ? (
        <List.EmptyView
          icon={Icon.EyeDisabled}
          title="Hyperduck history is off"
          description={
            links.length > 0
              ? "Only links saved earlier are shown. Turn on history in Hyperduck settings to keep new links."
              : "Turn on history in Hyperduck settings to keep the links you send to this Mac."
          }
          actions={
            <ActionPanel>
              <Action
                title="Open Hyperduck"
                icon={Icon.AppWindow}
                onAction={() => open("/Applications/Hyperduck.app")}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Link}
          title="No links yet"
          description="Links you send to this Mac with Hyperduck appear here."
        />
      )}
      {[...sections.entries()].map(([title, items]) => (
        <List.Section key={title} title={title} subtitle={`${items.length}`}>
          {items.map((link) => (
            <LinkItem
              key={link.id}
              link={link}
              archivedOnly={data ? !data.liveIds.has(link.id) : false}
              onHide={() => hide(link)}
              onClearAll={clearAll}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function LinkItem(props: { link: HyperduckLink; archivedOnly: boolean; onHide: () => void; onClearAll: () => void }) {
  const { link, archivedOnly } = props;
  const date = new Date(link.date);
  const isWeb = /^https?:\/\//i.test(link.url);
  return (
    <List.Item
      icon={isWeb ? getFavicon(link.url, { fallback: Icon.Globe }) : Icon.Link}
      title={displayTitle(link.url)}
      keywords={[link.url]}
      accessories={[
        ...(archivedOnly
          ? [{ icon: Icon.Tray, tooltip: "Kept by this extension. No longer in Hyperduck's history." }]
          : []),
        { date, tooltip: date.toLocaleString() },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={link.url} />
            <Action.CopyToClipboard title="Copy URL" content={link.url} />
            <Action.Paste title="Paste URL" content={link.url} shortcut={{ modifiers: ["cmd", "shift"], key: "v" }} />
            <Action.OpenWith path={link.url} shortcut={Keyboard.Shortcut.Common.Open} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Remove from List"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={props.onHide}
            />
            <Action
              title="Clear List"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.RemoveAll}
              onAction={props.onClearAll}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
