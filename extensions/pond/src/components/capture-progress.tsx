import { Action, ActionPanel, Color, Detail, Icon, Keyboard, popToRoot } from "@raycast/api";
import type { ApiSaveState } from "pond-api";
import { useEffect, useState } from "react";
import { pond } from "../api/client";
import type { EnqueueResult } from "../lib/capture";
import { escapeMarkdown } from "../lib/display";
import { hostname, saveLink } from "../lib/links";

const POLL_MS = 1500;
/** Big videos can take minutes; past this, Pond keeps going and the screen stops asking. */
const POLL_LIMIT_MS = 120_000;

function statusTag(state: ApiSaveState | null, timedOut: boolean) {
  if (state?.status === "failed") return { text: "Failed", color: Color.Red };
  if (state && state.pendingTasks === 0) return { text: "Done", color: Color.Green };
  if (timedOut) return { text: "Still capturing in Pond", color: Color.Orange };
  return { text: "Capturing", color: Color.Orange };
}

export function CaptureProgress({ result, url, title }: { result: EnqueueResult; url: string; title: string }) {
  const [state, setState] = useState<ApiSaveState | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: NodeJS.Timeout | undefined;
    const started = Date.now();
    async function poll() {
      const [next] = await pond()
        .status([result.id])
        .catch(() => []);
      if (!active) return;
      if (next) setState(next);
      const settled = next && (next.pendingTasks === 0 || next.status === "failed");
      if (settled) return;
      if (Date.now() - started > POLL_LIMIT_MS) return setTimedOut(true);
      timer = setTimeout(poll, POLL_MS);
    }
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [result.id]);

  const tag = statusTag(state, timedOut);
  const found = state
    ? [
        state.text.caption && "Caption",
        state.text.ocr && "Text in Images",
        state.text.transcript && "Transcript",
      ].filter((item): item is string => Boolean(item))
    : [];

  return (
    <Detail
      navigationTitle={title}
      isLoading={!state || (state.pendingTasks > 0 && state.status !== "failed" && !timedOut)}
      markdown={`## ${title}\n\n${escapeMarkdown(url)}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={tag.text} color={tag.color} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Link title="Link" target={url} text={hostname(url)} />
          {state && state.pendingTasks > 0 && (
            <Detail.Metadata.Label title="Steps Left" text={String(state.pendingTasks)} />
          )}
          {state && state.failedTasks > 0 && (
            <Detail.Metadata.Label title="Failed Steps" text={String(state.failedTasks)} />
          )}
          {state && <Detail.Metadata.Label title="Thumbnail" text={state.thumbnail ? "Yes" : "Not yet"} />}
          {found.length > 0 && <Detail.Metadata.Label title="Found" text={found.join(", ")} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Open title="Open in Pond" icon={Icon.AppWindow} target={saveLink({ id: result.id })} />
          <Action.OpenInBrowser title="Open Original" url={url} />
          <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
          <Action title="Done" icon={Icon.Check} onAction={() => popToRoot({ clearSearchBar: true })} />
        </ActionPanel>
      }
    />
  );
}
