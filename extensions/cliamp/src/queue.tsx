import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast, Keyboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { callOp, getSnapshot, Track, trackLabel } from "./lib/ipc";

interface QueueData {
  tracks: Track[];
  total: number;
  currentPath?: string;
  playlistRevision?: number;
}

export default function LivePlaylist() {
  const { data, isLoading, revalidate } = usePromise(async (): Promise<QueueData> => {
    const [res, snap] = await Promise.all([
      callOp<{ tracks?: Track[]; total?: number }>("queue.list", { offset: 0, limit: 500 }),
      getSnapshot(),
    ]);
    return {
      tracks: res.tracks ?? [],
      total: res.total ?? res.tracks?.length ?? 0,
      currentPath: (snap.track ?? snap.logical_track)?.path as string | undefined,
      playlistRevision: snap.playlist_revision,
    };
  });

  async function run(operation: string, params: Record<string, unknown>, message?: string) {
    try {
      await callOp(operation, params);
      if (message) await showToast({ style: Toast.Style.Success, title: message });
      revalidate();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "cliamp error",
        message: String(e instanceof Error ? e.message : e),
      });
    }
  }

  const tracks = data?.tracks ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Filter ${data?.total ?? 0} tracks…`}>
      {tracks.map((t, i) => {
        const isCurrent = !!t.path && t.path === data?.currentPath;
        return (
          <List.Item
            key={`${t.path ?? t.title ?? "t"}-${i}`}
            icon={isCurrent ? Icon.SpeakerOn : t.stream ? Icon.Livestream : Icon.Music}
            title={trackLabel(t)}
            subtitle={t.artist}
            accessories={[...(isCurrent ? [{ tag: "now" }] : []), { text: `#${i + 1}` }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action title="Play" icon={Icon.Play} onAction={() => run("queue.play", { index: i })} />
                  <Action
                    title="Queue Next"
                    icon={Icon.Forward}
                    onAction={() => run("queue.enqueue", { index: i }, "Queued next")}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section title="Edit">
                  <Action
                    title="Move up"
                    icon={Icon.ArrowUp}
                    shortcut={Keyboard.Shortcut.Common.MoveUp}
                    onAction={() => i > 0 && run("queue.move", { index: i, to: i - 1 })}
                  />
                  <Action
                    title="Move Down"
                    icon={Icon.ArrowDown}
                    shortcut={Keyboard.Shortcut.Common.MoveDown}
                    onAction={() => i < tracks.length - 1 && run("queue.move", { index: i, to: i + 1 })}
                  />
                  <Action
                    title="Remove"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => run("queue.remove", { index: i }, "Removed")}
                  />
                  <Action
                    title="Clear Playlist"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Clear the live playlist?",
                          message: `${data?.total ?? 0} tracks will be removed.`,
                          primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
                        })
                      ) {
                        await run("queue.clear", {}, "Playlist cleared");
                      }
                    }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "l" }}
                    onAction={revalidate}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
      <List.EmptyView
        icon={Icon.Music}
        title="Live playlist is empty"
        description="Search for music and queue something."
      />
    </List>
  );
}
