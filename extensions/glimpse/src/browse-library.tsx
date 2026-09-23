import { Action, ActionPanel, Color, Icon, Keyboard, List, showInFinder, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { homedir } from "node:os";
import { join } from "node:path";
import { ErrorEmptyView } from "./error-view";
import { glimpse } from "./glimpse";

interface LibraryItem {
  id: string;
  name: string;
  status: string;
  progress: number;
  error: string | null;
  transcript: string | null;
  duration_seconds: number | null;
  speech_model: string | null;
  created_at: string | null;
  // "import" or "recording"; older CLIs omit both fields.
  kind?: string;
  tracks?: number | null;
}

const FORMATS = ["txt", "md", "srt", "vtt"] as const;

export default function Command() {
  const { data, error, isLoading, revalidate } = useCachedPromise(
    async () => {
      const res = await glimpse<{ items: LibraryItem[] }>(["library", "list", "--limit", "50"]);
      return res.items;
    },
    [],
    { onError: () => undefined },
  );

  async function exportItem(item: LibraryItem, format: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Exporting ${format}…` });
    try {
      const stem = fileStem(item.name);
      const out = join(homedir(), "Downloads", `${stem}.${format}`);
      const res = await glimpse<{ output: string }>(["library", "export", item.id, "--to", format, "--output", out]);
      toast.style = Toast.Style.Success;
      toast.title = "Exported";
      toast.message = res.output;
      await showInFinder(res.output);
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Glimpse";
      toast.message = (error as Error).message;
    }
  }

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search library">
      {(error ? [] : (data ?? [])).map((item) => {
        const done = item.status === "complete";
        const recording = item.kind === "recording";
        return (
          <List.Item
            key={item.id}
            title={item.name}
            icon={iconFor(item)}
            accessories={[
              ...(recording && item.tracks === 2 ? [{ text: "2 tracks", tooltip: "Microphone and system audio" }] : []),
              done
                ? { icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Complete" }
                : { tag: { value: item.status, color: Color.SecondaryText } },
            ]}
            detail={
              <List.Item.Detail
                markdown={done ? item.transcript || "_(empty)_" : statusMarkdown(item)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Status" text={item.status} />
                    {recording && item.tracks ? (
                      <List.Item.Detail.Metadata.Label title="Tracks" text={String(item.tracks)} />
                    ) : null}
                    {item.speech_model ? (
                      <List.Item.Detail.Metadata.Label title="Model" text={item.speech_model} />
                    ) : null}
                    {item.duration_seconds ? (
                      <List.Item.Detail.Metadata.Label title="Duration" text={formatDuration(item.duration_seconds)} />
                    ) : null}
                    {item.created_at ? (
                      <List.Item.Detail.Metadata.Label
                        title="Created"
                        text={new Date(item.created_at).toLocaleString()}
                      />
                    ) : null}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                {done && <Action.CopyToClipboard content={item.transcript ?? ""} />}
                {done && <Action.Paste content={item.transcript ?? ""} />}
                {done && (
                  <ActionPanel.Submenu title="Export…" icon={Icon.Download}>
                    {FORMATS.map((format) => (
                      <Action key={format} title={format.toUpperCase()} onAction={() => exportItem(item, format)} />
                    ))}
                  </ActionPanel.Submenu>
                )}
                <Action title="Open in Glimpse" icon={Icon.AppWindow} onAction={() => openLibrary()} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={() => revalidate()}
                />
                <Action
                  title="Open Record Screen"
                  icon={Icon.Microphone}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "r" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "r" },
                  }}
                  onAction={() => openRecord()}
                />
              </ActionPanel>
            }
          />
        );
      })}
      {error ? (
        <ErrorEmptyView error={error} onRetry={revalidate} />
      ) : (
        <List.EmptyView
          title="Library is empty"
          description="Add files or make a recording to see them here."
          actions={
            <ActionPanel>
              <Action title="Open Record Screen" icon={Icon.Microphone} onAction={() => openRecord()} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function iconFor(item: LibraryItem) {
  if (item.status === "error") return { source: Icon.ExclamationMark, tintColor: Color.Red };
  if (item.kind === "recording") {
    return { source: Icon.Microphone, tintColor: item.status === "complete" ? Color.Green : undefined };
  }
  if (item.status === "complete") return { source: Icon.CheckCircle, tintColor: Color.Green };
  return Icon.Clock;
}

function statusMarkdown(item: LibraryItem): string {
  if (item.status === "error") {
    return `# ${item.name}\n\nError: ${item.error ?? "unknown"}`;
  }
  return `# ${item.name}\n\n${item.status}… ${Math.round((item.progress ?? 0) * 100)}%`;
}

// Recording names contain characters like ":" that Windows can't use in file names.
function fileStem(name: string): string {
  const stem = name.replace(/\.[^/.]+$/, "") || name;
  // eslint-disable-next-line no-control-regex
  const safe = stem.replace(/[<>:"/\\|?*\x00-\x1f]/g, "-").trim() || "Transcript";
  // Windows also refuses device names like CON or COM1, even with an extension.
  return safe.replace(/^(con|prn|aux|nul|com\d|lpt\d)(?=\.|$)/i, "$1-transcript");
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

async function openLibrary() {
  try {
    await glimpse(["open", "library"]);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't open Glimpse" });
  }
}

async function openRecord() {
  try {
    await glimpse(["open", "record"]);
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't open Glimpse" });
  }
}
