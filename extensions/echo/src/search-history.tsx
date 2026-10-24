import { useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise, showFailureToast } from "@raycast/utils";
import {
  EchoError,
  EchoItem,
  completionLabel,
  fetchHistory,
  playPause,
  resumeItem,
  setPinned,
  setSaved,
  renameItem,
  removeItem,
  removeSource,
  neverRecord,
} from "./echo";

const TYPE_ICON: Record<string, Icon> = {
  music: Icon.Music,
  podcast: Icon.Microphone,
  video: Icon.Video,
  unknown: Icon.SpeakerOn,
};

export default function SearchHistory() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");

  // Cached so reopening the command shows your history instantly, and the previous results stay
  // on screen while a new search runs rather than flashing an empty list.
  const { data, isLoading, error, revalidate } = useCachedPromise(
    (q: string, t: string) => fetchHistory(q, t),
    [query, type],
    { keepPreviousData: true },
  );

  if (error) return <ErrorView error={error} onRetry={revalidate} />;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search everything you have played"
      throttle
      // Echo does the matching, so Raycast must not filter the results a second time.
      filtering={false}
      searchBarAccessory={
        <List.Dropdown tooltip="Type" storeValue onChange={setType}>
          <List.Dropdown.Item title="Everything" value="all" />
          <List.Dropdown.Item title="Music" value="music" />
          <List.Dropdown.Item title="Podcasts" value="podcast" />
          <List.Dropdown.Item title="Video" value="video" />
        </List.Dropdown>
      }
    >
      {/* Only once loading has finished, so "Nothing played yet" never flashes before the list. */}
      {!isLoading && (
        <List.EmptyView
          icon={Icon.Waveform}
          title={query ? "Nothing matches that" : "Nothing played yet"}
          description={query ? "Try a different search." : "Play something for a few seconds and it will appear here."}
        />
      )}
      {(data ?? []).map((item) => (
        <Row key={item.id} item={item} onChanged={revalidate} />
      ))}
    </List>
  );
}

function Row({ item, onChanged }: { item: EchoItem; onChanged: () => void }) {
  // Echo composes this itself (artist or app, plus a play count once it becomes a habit).
  const subtitle = item.subtitle;
  const accessories: List.Item.Accessory[] = [];

  if (item.pinned) accessories.push({ icon: Icon.Pin, tooltip: "Pinned" });
  if (item.saved) accessories.push({ icon: Icon.Bookmark, tooltip: "Saved" });
  // Percent complete, as Echo shows it: podcasts and videos only, never music.
  const completion = completionLabel(item);
  if (completion) accessories.push({ text: completion });
  accessories.push({ date: new Date(item.lastPlayed), tooltip: "Last played" });
  // The pill goes LAST on purpose. Raycast right-aligns the accessory block, so only the final
  // item sits at a fixed edge; anywhere earlier and the pill drifts with the width of whatever
  // is beside it. Color is Echo's own brand color for that source.
  accessories.push({ tag: { value: item.service, color: item.serviceColor } });

  // Prefer the cover Echo already cached on disk; fall back to the remote one.
  const artwork = item.artworkPath ?? item.artworkURL;

  async function run(label: string, fn: () => Promise<unknown>) {
    try {
      await fn();
      await showToast({ style: Toast.Style.Success, title: label });
      onChanged();
    } catch (e) {
      await showFailureToast(e, { title: e instanceof EchoError ? e.message : "That did not work" });
    }
  }

  // Playback actions close Raycast once Echo has started, leaving a short HUD. A failure keeps the
  // window open so the error toast is still visible.
  async function play(label: string, fn: () => Promise<unknown>) {
    try {
      await fn();
      await showHUD(label, { clearRootSearch: true, popToRootType: PopToRootType.Immediate });
    } catch (e) {
      await showFailureToast(e, { title: e instanceof EchoError ? e.message : "That did not work" });
    }
  }

  async function confirmRun(message: string, confirmTitle: string, success: string, fn: () => Promise<unknown>) {
    const confirmed = await confirmAlert({
      title: confirmTitle,
      message,
      primaryAction: { title: confirmTitle, style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) await run(success, fn);
  }

  return (
    <List.Item
      icon={artwork ? { source: artwork, fallback: TYPE_ICON[item.type] } : TYPE_ICON[item.type]}
      title={item.title}
      subtitle={subtitle}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {/* Echo's own Play section, same names and same order. Return resolves exactly as it
                does in Echo: a web video comes back the way you last had it. */}
            <Action title="Play" icon={Icon.Play} onAction={() => play("Playing", () => resumeItem(item.id, "auto"))} />
            <Action
              title="Play and Open"
              icon={Icon.ArrowNe}
              onAction={() => play("Opening", () => resumeItem(item.id, "open"))}
            />
            {item.canPiP && (
              <Action
                title={item.prefersWatch ? "Play in Background" : "Play in Picture in Picture"}
                icon={item.prefersWatch ? Icon.SpeakerOn : Icon.Video}
                shortcut={{ modifiers: ["opt"], key: "enter" }}
                onAction={() =>
                  play(item.prefersWatch ? "Playing in the background" : "Opening Picture in Picture", () =>
                    resumeItem(item.id, item.prefersWatch ? "background" : "pip"),
                  )
                }
              />
            )}
            <Action
              title="Play from Beginning"
              icon={Icon.Rewind}
              shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
              onAction={() => play("Playing from the beginning", () => resumeItem(item.id, "start"))}
            />
            <Action
              title="Play or Pause"
              icon={Icon.Pause}
              shortcut={{ modifiers: ["cmd", "shift"], key: "space" }}
              onAction={() => play("Toggled playback", playPause)}
            />
          </ActionPanel.Section>

          <ActionPanel.Section>
            <Action
              title={item.saved ? "Remove from Saved" : "Save"}
              icon={Icon.Bookmark}
              shortcut={Keyboard.Shortcut.Common.Save}
              onAction={() => run(item.saved ? "Removed from Saved" : "Saved", () => setSaved(item.id, !item.saved))}
            />
            <Action
              title={item.pinned ? "Unpin" : "Pin to Top"}
              icon={Icon.Pin}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={() =>
                run(item.pinned ? "Unpinned" : "Pinned to the top", () => setPinned(item.id, !item.pinned))
              }
            />
            <Action.Push
              title="Rename…"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={<RenameForm item={item} onDone={onChanged} />}
            />
          </ActionPanel.Section>

          {item.resumeURL && (
            <ActionPanel.Section>
              <Action.CopyToClipboard
                title="Copy Link"
                content={item.cleanURL ?? item.resumeURL}
                shortcut={{ modifiers: ["cmd"], key: "l" }}
              />
              {/* Echo only shows this when the link actually carries a timestamp. */}
              {item.hasTimestamp && (
                <Action.CopyToClipboard
                  title="Copy Link with Timestamp"
                  content={item.resumeURL}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                />
              )}
            </ActionPanel.Section>
          )}

          {/* Echo's Remove section. Confirmed first: a launcher is far easier to fire by accident
              than a panel you already have open. */}
          <ActionPanel.Section>
            <Action
              title="Remove from History"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
              onAction={() =>
                confirmRun(`Remove "${item.title}" from your history?`, "Remove", "Removed from history", () =>
                  removeItem(item.id),
                )
              }
            />
            <Action
              title="Remove Everything from This Source"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() =>
                confirmRun(
                  `Remove everything from ${item.appName} from your history?`,
                  "Remove Everything",
                  "Removed",
                  () => removeSource(item.id),
                )
              }
            />
            <Action
              title="Never Record This Source"
              icon={Icon.MinusCircle}
              style={Action.Style.Destructive}
              onAction={() =>
                confirmRun(
                  `Stop Echo recording anything from ${item.appName}?`,
                  "Never Record",
                  "Echo will stop recording this",
                  () => neverRecord(item.id),
                )
              }
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/// Rename, matching Echo: clearing the field resets to the name Echo captured.
function RenameForm({ item, onDone }: { item: EchoItem; onDone: () => void }) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(item.title);

  async function submit() {
    try {
      await renameItem(item.id, title);
      await showToast({ style: Toast.Style.Success, title: title.trim() ? "Renamed" : "Name reset" });
      onDone();
      pop();
    } catch (e) {
      await showFailureToast(e, { title: e instanceof EchoError ? e.message : "Could not rename" });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Name"
        placeholder={item.title}
        value={title}
        onChange={setTitle}
        info="Leave this empty to go back to the name Echo captured."
      />
    </Form>
  );
}

/// Echo not running, access switched off, or a stale token: say which, and what to do about it.
function ErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const isEcho = error instanceof EchoError;
  return (
    <List>
      <List.EmptyView
        icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
        title={isEcho ? error.message : "Could not reach Echo"}
        description={isEcho ? (error as EchoError).hint : "Open Echo and try again."}
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
            <Action.Open title="Open Echo" target="/Applications/Echo.app" icon={Icon.AppWindow} />
          </ActionPanel>
        }
      />
    </List>
  );
}
