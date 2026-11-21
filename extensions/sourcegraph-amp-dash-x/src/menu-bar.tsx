import { Clipboard, Color, environment, Icon, Keyboard, LaunchType, MenuBarExtra, showHUD } from "@raycast/api";
import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";
import { liveThreads, type LiveThread } from "./lib/amp";
import { loadSeen, markSeen, readyThreads, swapWorkingSet } from "./lib/inbox";
import { launch, openInAmp, relativeTime } from "./lib/ui";

type Inbox = { ready: LiveThread[]; working: LiveThread[] };

/** Reads the live thread list; on background refreshes, announces threads that just finished. */
async function loadInbox(): Promise<Inbox> {
  const threads = await liveThreads();
  const working = threads.filter((t) => t.working);
  const ready = readyThreads(threads, await loadSeen());
  const justFinished = await swapWorkingSet(working, ready);
  if (environment.launchType === LaunchType.Background && justFinished.length) {
    await showHUD(
      justFinished.length === 1
        ? `Amp: “${justFinished[0].title ?? "Thread"}” is ready`
        : `Amp: ${justFinished.length} threads are ready`,
    );
  }
  return { ready, working };
}

export default function AmpMenuBar() {
  // Keep the last inbox while Amp is unreachable, rather than flashing an empty one.
  const [cached, setCached] = useCachedState<Inbox>("menu-bar-inbox", { ready: [], working: [] });
  const { isLoading, revalidate, error } = useCachedPromise(loadInbox, [], { onData: setCached });
  const { ready, working } = cached;

  const open = async (t: LiveThread, seen: boolean) => {
    try {
      await openInAmp(t.url);
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't open thread" });
      return;
    }
    if (seen) {
      await markSeen([t.id]);
      revalidate();
    }
  };
  const item = (t: LiveThread, isReady: boolean) => (
    <MenuBarExtra.Item
      key={t.id}
      title={t.title ?? "Untitled thread"}
      subtitle={[t.project, relativeTime(t.updatedAt)].filter(Boolean).join(" · ")}
      icon={
        isReady
          ? { source: Icon.CheckCircle, tintColor: Color.Orange }
          : { source: Icon.CircleProgress50, tintColor: Color.Green }
      }
      tooltip="Click to open · right-click to copy URL"
      onAction={(e) => (e.type === "right-click" ? Clipboard.copy(t.url) : open(t, isReady))}
    />
  );

  const tooltip = [
    working.length ? `${working.length} working` : "No agents working",
    ready.length ? `${ready.length} ready for you` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{
        source: "amp-menubar.png",
        tintColor: working.length ? Color.Green : ready.length ? Color.Orange : Color.PrimaryText,
      }}
      // The menu bar can't color text, so a dot after the working count says something is ready.
      title={[working.length || undefined, ready.length ? "•" : undefined].filter(Boolean).join(" ") || undefined}
      tooltip={tooltip}
    >
      {error && (
        <MenuBarExtra.Item key="error" title="Couldn't reach Amp" subtitle={error.message} icon={Icon.Warning} />
      )}
      <MenuBarExtra.Section key="ready" title={`Ready for You · ${ready.length}`}>
        {ready.length === 0 && <MenuBarExtra.Item key="caught-up" title="All caught up" icon={Icon.CheckCircle} />}
        {ready.slice(0, 15).map((t) => item(t, true))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section key="working" title={`Working · ${working.length}`}>
        {working.length === 0 && <MenuBarExtra.Item key="idle" title="No agents working" icon={Icon.Moon} />}
        {working.map((t) => item(t, false))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section key="footer">
        <MenuBarExtra.Item
          key="new"
          title="New Thread…"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => launch("new-thread")}
        />
        <MenuBarExtra.Item
          key="puck"
          title="Ask Puck…"
          icon={Icon.SpeechBubble}
          shortcut={{ modifiers: ["cmd"], key: "j" }}
          onAction={() => launch("ask-puck")}
        />
        <MenuBarExtra.Item
          key="home"
          title="Open Amp"
          icon={Icon.AppWindowList}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => launch("browse")}
        />
        {ready.length > 0 && (
          <MenuBarExtra.Item
            key="mark-seen"
            title="Mark All as Seen"
            icon={Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={async () => {
              await markSeen(ready.map((t) => t.id));
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
