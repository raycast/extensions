import { Action, ActionPanel, Color, Icon, List, showInFinder, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { homedir } from "node:os";
import { join } from "node:path";
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
}

const FORMATS = ["txt", "md", "srt", "vtt"] as const;

export default function Command() {
  const { data, isLoading, revalidate } = useCachedPromise(async () => {
    const res = await glimpse<{ items: LibraryItem[] }>(["library", "list", "--limit", "50"]);
    return res.items;
  });

  async function exportItem(item: LibraryItem, format: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Exporting ${format}…` });
    try {
      const stem = item.name.replace(/\.[^/.]+$/, "") || item.name;
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
      {(data ?? []).map((item) => {
        const done = item.status === "complete";
        return (
          <List.Item
            key={item.id}
            title={item.name}
            icon={iconFor(item.status)}
            accessories={[{ tag: { value: item.status, color: done ? Color.Green : Color.SecondaryText } }]}
            detail={
              <List.Item.Detail
                markdown={done ? item.transcript || "_(empty)_" : statusMarkdown(item)}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Status" text={item.status} />
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
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => revalidate()}
                />
              </ActionPanel>
            }
          />
        );
      })}
      <List.EmptyView title="Library is empty" description="Add files to see them here." />
    </List>
  );
}

function iconFor(status: string) {
  if (status === "complete") return { source: Icon.CheckCircle, tintColor: Color.Green };
  if (status === "error") return { source: Icon.ExclamationMark, tintColor: Color.Red };
  return Icon.Clock;
}

function statusMarkdown(item: LibraryItem): string {
  if (item.status === "error") {
    return `# ${item.name}\n\nError: ${item.error ?? "unknown"}`;
  }
  return `# ${item.name}\n\n${item.status}… ${Math.round((item.progress ?? 0) * 100)}%`;
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
