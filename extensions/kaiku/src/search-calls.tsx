import { Action, ActionPanel, Clipboard, Color, Icon, List, showHUD } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import { Call, readSummary, readTranscript, searchCalls } from "./lib/calls";
import { KaikuNotInstalledError, RELEASES_URL, openKaiku, showNotInstalled } from "./lib/kaiku";

function dateText(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

async function copy(call: Call, what: "Transcript" | "Summary") {
  try {
    const text = what === "Transcript" ? await readTranscript(call.id) : await readSummary(call.id);
    await Clipboard.copy(text);
    await showHUD(`${what} copied`);
  } catch (error) {
    await showFailureToast(error, { title: `Could not copy the ${what.toLowerCase()}` });
  }
}

export default function Command() {
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading, error } = usePromise(searchCalls, [text], {
    onError: (e) => {
      if (e instanceof KaikuNotInstalledError) showNotInstalled();
    },
  });
  const calls = data?.calls ?? [];
  const call = calls.find((c) => c.id === selected);

  // Tagged with the call it belongs to, errors included, so a reply for a previous selection is never shown.
  const preview = usePromise(
    async (id: string | undefined, hasSummary: boolean | undefined, hasTranscript: boolean | undefined) => {
      if (!id) return { id: "", text: "" };
      try {
        if (hasSummary) return { id, text: await readSummary(id) };
        if (!hasTranscript) return { id, text: "" };
        return { id, text: await readTranscript(id, 3000, false) };
      } catch (e) {
        return { id, text: "", error: e instanceof Error ? e.message : String(e) };
      }
    },
    [call?.id, call?.hasSummary, call?.hasTranscript],
  );

  function markdown(c: Call): string {
    const snippet = data?.snippets[c.id];
    const parts: string[] = [];
    if (snippet) parts.push(`> ${snippet}`);
    if (c.id === call?.id) {
      const current = preview.data?.id === c.id ? preview.data : undefined;
      if (current?.text) parts.push(current.text);
      else if (current?.error) parts.push(`Couldn't load the preview: ${current.error}`);
      else if (!preview.isLoading && current) parts.push("No transcript yet.");
    }
    return parts.join("\n\n");
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      filtering={false}
      throttle
      searchBarPlaceholder="Search calls and transcripts"
      onSearchTextChange={setText}
      onSelectionChange={setSelected}
    >
      {error instanceof KaikuNotInstalledError ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Kaiku is not installed"
          description="Download it from GitHub, then search your calls here."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Download Page" url={RELEASES_URL} />
            </ActionPanel>
          }
        />
      ) : error ? (
        <List.EmptyView icon={Icon.ExclamationMark} title="Could not read your calls" description={error.message} />
      ) : (
        <List.EmptyView title="No calls found" />
      )}
      {calls.map((c) => (
        <List.Item
          key={c.id}
          id={c.id}
          title={c.title}
          icon={{ source: c.source && c.source !== "Manual" ? Icon.Video : Icon.Microphone, tintColor: Color.Red }}
          keywords={[c.source ?? "", ...c.tags]}
          accessories={[
            {
              text: new Date(c.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
              tooltip: [c.source, c.duration].filter(Boolean).join(" · "),
            },
          ]}
          detail={
            <List.Item.Detail
              isLoading={c.id === call?.id && preview.isLoading}
              markdown={markdown(c)}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Date" text={dateText(c.date)} />
                  <List.Item.Detail.Metadata.Label title="Duration" text={c.duration} />
                  {c.source ? <List.Item.Detail.Metadata.Label title="Source" text={c.source} /> : null}
                  {c.tags.length > 0 ? (
                    <List.Item.Detail.Metadata.TagList title="Tags">
                      {c.tags.map((t) => (
                        <List.Item.Detail.Metadata.TagList.Item key={t} text={t} />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  ) : null}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Open in Kaiku"
                icon={Icon.AppWindow}
                onAction={() => openKaiku(`kaiku://open?folder=${encodeURIComponent(c.folder)}`)}
              />
              {c.hasTranscript ? (
                <Action
                  title="Copy Transcript"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "t" }}
                  onAction={() => copy(c, "Transcript")}
                />
              ) : null}
              {c.hasSummary ? (
                <Action
                  title="Copy Summary"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
                  onAction={() => copy(c, "Summary")}
                />
              ) : null}
              <Action.ShowInFinder path={c.folder} />
              {preview.data?.error && preview.data.id === c.id ? (
                <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => preview.revalidate()} />
              ) : null}
            </ActionPanel>
          }
        />
      ))}
      {data?.truncated ? (
        <List.Section
          title={
            text.trim()
              ? "Not every match is shown. Refine your search to narrow it down."
              : "Showing the latest 100 calls. Search to find older ones."
          }
        />
      ) : null}
    </List>
  );
}
