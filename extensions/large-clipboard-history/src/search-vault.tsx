import { Action, ActionPanel, Alert, Clipboard, confirmAlert, Detail, Icon, List, showToast } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { captureFromClipboard } from "./lib/capture";
import { ClipRow, deleteClipById, getClipContent, listClips } from "./lib/db";

const LIST_LIMIT = 200;

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [captureDone, setCaptureDone] = useState(false);

  // capture-on-open so a freshly copied >32k clip is searchable instantly without waiting for the 10s watcher tick
  useEffect(() => {
    captureFromClipboard().finally(() => setCaptureDone(true));
  }, []);

  const { isLoading, data, revalidate } = usePromise(
    (search: string) => listClips({ search, limit: LIST_LIMIT }),
    [searchText],
    { execute: captureDone },
  );

  const showSpinner = isLoading || !captureDone;
  const rows = data ?? [];

  return (
    <List
      isLoading={showSpinner}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search history…"
      throttle
    >
      {!showSpinner && rows.length === 0 ? (
        <List.EmptyView
          icon={Icon.Tray}
          title={searchText ? "No matches" : "Nothing here yet"}
          description={
            searchText
              ? "Try a different search."
              : "Copy something larger than 32,768 characters and the watcher will catch it within ~10 seconds."
          }
        />
      ) : (
        rows.map((row) => <ClipItem key={row.id} row={row} onChanged={revalidate} />)
      )}
    </List>
  );
}

function ClipItem({ row, onChanged }: { row: ClipRow; onChanged: () => void }) {
  const flatPreview = row.preview.replace(/\s+/g, " ").trim();
  return (
    <List.Item
      title={flatPreview || "(whitespace only)"}
      accessories={[{ text: `${row.char_count.toLocaleString()} chars` }, { date: new Date(row.created_at) }]}
      actions={
        <ActionPanel>
          <Action
            title="Paste to Active App"
            icon={Icon.Document}
            onAction={() => applyClip({ id: row.id, mode: "paste" })}
          />
          <Action
            title="Copy to Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
            onAction={() => applyClip({ id: row.id, mode: "copy" })}
          />
          <Action.Push
            title="Show Full Content"
            icon={Icon.Eye}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            target={<ClipDetail id={row.id} />}
          />
          <Action
            title="Delete"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => promptDelete({ id: row.id, onChanged })}
          />
          <Action
            title="Refresh"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onChanged}
          />
        </ActionPanel>
      }
    />
  );
}

function ClipDetail({ id }: { id: number }) {
  const { isLoading, data } = usePromise((clipId: number) => getClipContent({ id: clipId }), [id]);
  const content = data ?? "";
  const markdown = isLoading ? "Loading…" : createCodeBlockMarkdown({ content });

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Copy to Clipboard" icon={Icon.Clipboard} onAction={() => Clipboard.copy(content)} />
          <Action title="Paste to Active App" icon={Icon.Document} onAction={() => Clipboard.paste(content)} />
        </ActionPanel>
      }
    />
  );
}

function createCodeBlockMarkdown({ content }: { content: string }) {
  // fast path skips the regex scan for the common case (no backticks in clip)
  if (!content.includes("`")) return `\`\`\`\n${content}\n\`\`\``;
  let fenceSize = 3;
  for (const match of content.matchAll(/`+/g)) {
    const [fence] = match;
    fenceSize = Math.max(fenceSize, fence.length + 1);
  }
  const fence = "`".repeat(fenceSize);
  return `${fence}\n${content}\n${fence}`;
}

async function applyClip({ id, mode }: { id: number; mode: "copy" | "paste" }) {
  const content = await getClipContent({ id });
  if (!content) {
    await showFailureToast("Clip not found");
    return;
  }
  if (mode === "copy") {
    await Clipboard.copy(content);
    await showToast({ title: "Copied", message: `${content.length.toLocaleString()} chars` });
    return;
  }
  await Clipboard.paste(content);
}

async function promptDelete({ id, onChanged }: { id: number; onChanged: () => void }) {
  const confirmed = await confirmAlert({
    title: "Delete clip?",
    message: "This cannot be undone.",
    primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
  });
  if (!confirmed) return;
  await deleteClipById({ id });
  await showToast({ title: "Deleted" });
  onChanged();
}
