import { Clipboard, Color, Icon, launchCommand, LaunchType, MenuBarExtra, open, Keyboard } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { AMP_URL, liveThreads } from "./lib/amp";
import { openInAmp, relativeTime } from "./lib/ui";

async function launch(name: string) {
  try {
    await launchCommand({ name, type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't open command" });
  }
}

export default function CurrentlyRunning() {
  const { data, isLoading, error } = useCachedPromise(() => liveThreads());
  const working = (data ?? []).filter((t) => t.working);
  const byProject = new Map<string, typeof working>();
  for (const t of working)
    byProject.set(t.project || "No project", [...(byProject.get(t.project || "No project") ?? []), t]);

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: "amp-menubar.png", tintColor: working.length ? Color.Green : Color.PrimaryText }}
      title={working.length ? String(working.length) : undefined}
      tooltip={working.length ? `${working.length} Amp agents working` : "No Amp agents working"}
    >
      {error && (
        <MenuBarExtra.Item key="error" title="Couldn't reach Amp" subtitle={error.message} icon={Icon.Warning} />
      )}
      {!working.length && !error && <MenuBarExtra.Item key="idle" title="No agents working" icon={Icon.Moon} />}
      {[...byProject].map(([project, threads]) => (
        <MenuBarExtra.Section key={project} title={project}>
          {threads.map((t) => (
            <MenuBarExtra.Item
              key={t.id}
              title={t.title ?? "Untitled thread"}
              subtitle={`active ${relativeTime(t.updatedAt)} ago`}
              icon={{ source: Icon.CircleProgress50, tintColor: Color.Green }}
              onAction={(e) => (e.type === "right-click" ? Clipboard.copy(t.url) : openInAmp(t.url))}
              tooltip="Click to open · right-click to copy URL"
            />
          ))}
        </MenuBarExtra.Section>
      ))}
      <MenuBarExtra.Section key="footer">
        <MenuBarExtra.Item
          key="new"
          title="New Thread…"
          icon={Icon.Plus}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => launch("new-thread")}
        />
        <MenuBarExtra.Item
          title="Ask Puck…"
          icon={Icon.SpeechBubble}
          shortcut={{ modifiers: ["cmd"], key: "j" }}
          onAction={() => launch("ask-puck")}
        />
        <MenuBarExtra.Item title="Open Ampcode.com" icon={Icon.Globe} onAction={() => open(AMP_URL)} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
