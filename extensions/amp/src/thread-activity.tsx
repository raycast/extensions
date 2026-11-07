import { Color, environment, Icon, LaunchType, LocalStorage, MenuBarExtra, showHUD, Keyboard } from "@raycast/api";
import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";
import { liveThreads, type LiveThread } from "./lib/amp";
import { openInAmp, relativeTime } from "./lib/ui";

const SEEN = "activity-seen";
const WORKING = "activity-working";

type Inbox = { finished: LiveThread[]; working: LiveThread[] };

/**
 * A thread lands in the inbox when it stops working and was updated after you last opened
 * it from here. The previous working set lets the background refresh announce completions.
 */
async function loadInbox(): Promise<Inbox> {
  const threads = await liveThreads();
  const seen: Record<string, string> = JSON.parse((await LocalStorage.getItem<string>(SEEN)) ?? "{}");
  const wasWorking: string[] = JSON.parse((await LocalStorage.getItem<string>(WORKING)) ?? "[]");
  const working = threads.filter((t) => t.working);
  const dayAgo = Date.now() - 24 * 3600_000;
  const finished = threads
    .filter((t) => !t.working && new Date(t.updatedAt).getTime() > dayAgo)
    .filter((t) => !seen[t.id] || seen[t.id] < t.updatedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const justFinished = finished.filter((t) => wasWorking.includes(t.id));
  await LocalStorage.setItem(WORKING, JSON.stringify(working.map((t) => t.id)));
  if (environment.launchType === LaunchType.Background && justFinished.length) {
    await showHUD(
      justFinished.length === 1
        ? `Amp: “${justFinished[0].title ?? "Thread"}” is ready`
        : `Amp: ${justFinished.length} threads are ready`,
    );
  }
  return { finished, working };
}

async function markSeen(threads: LiveThread[]) {
  const seen: Record<string, string> = JSON.parse((await LocalStorage.getItem<string>(SEEN)) ?? "{}");
  for (const t of threads) seen[t.id] = new Date().toISOString();
  await LocalStorage.setItem(SEEN, JSON.stringify(seen));
}

export default function ThreadActivity() {
  const [cached, setCached] = useCachedState<Inbox>("inbox", { finished: [], working: [] });
  const { isLoading, revalidate, error } = useCachedPromise(loadInbox, [], { onData: setCached });
  const { finished, working } = cached;

  const open = async (t: LiveThread) => {
    try {
      await openInAmp(t.url);
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't open thread" });
      return;
    }
    await markSeen([t]);
    revalidate();
  };

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{
        source: finished.length ? Icon.Tray : Icon.CheckCircle,
        tintColor: finished.length ? Color.Orange : undefined,
      }}
      title={finished.length ? String(finished.length) : undefined}
      tooltip={finished.length ? `${finished.length} Amp threads ready for you` : "Amp inbox is empty"}
    >
      {error && (
        <MenuBarExtra.Item key="error" title="Couldn't reach Amp" subtitle={error.message} icon={Icon.Warning} />
      )}
      <MenuBarExtra.Section key="ready" title={`Ready for You · ${finished.length}`}>
        {finished.length === 0 && <MenuBarExtra.Item key="caught-up" title="All caught up" icon={Icon.CheckCircle} />}
        {finished.slice(0, 15).map((t) => (
          <MenuBarExtra.Item
            key={t.id}
            title={t.title ?? "Untitled thread"}
            subtitle={[t.project, relativeTime(t.updatedAt)].filter(Boolean).join(" · ")}
            icon={{ source: Icon.Dot, tintColor: Color.Orange }}
            onAction={() => open(t)}
          />
        ))}
      </MenuBarExtra.Section>
      {working.length > 0 && (
        <MenuBarExtra.Section key="working" title={`Working · ${working.length}`}>
          {working.map((t) => (
            <MenuBarExtra.Item
              key={t.id}
              title={t.title ?? "Untitled thread"}
              subtitle={t.project}
              icon={{ source: Icon.CircleProgress50, tintColor: Color.Green }}
              onAction={() => openInAmp(t.url)}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section key="footer">
        {finished.length > 0 && (
          <MenuBarExtra.Item
            key="mark-seen"
            title="Mark All as Seen"
            icon={Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={async () => {
              await markSeen(finished);
              revalidate();
            }}
          />
        )}
        <MenuBarExtra.Item
          key="refresh"
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
