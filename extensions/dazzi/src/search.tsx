import {
  Action,
  ActionPanel,
  getPreferenceValues,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { homedir } from "node:os";
import { useRef, useState } from "react";
import { askArgs, openArgs, retrieveArgs, retrieveCliPath, validateQuestion } from "./lib/dazzi";
import { runLauncher } from "./lib/launch";
import { detailMarkdown } from "./lib/markdown";
import { type Hit, type HitKind, parseRetrieveOutput, type RetrieveResult } from "./lib/retrieve";
import { DazziNotFoundError, resolveDazziApp, run } from "./lib/runtime";

const ICON_BY_KIND: Record<HitKind, Icon> = {
  file: Icon.Document,
  mail: Icon.Envelope,
  chat: Icon.SpeechBubble,
  web: Icon.Globe,
  other: Icon.MagnifyingGlass,
};

/** A search touches every index and datasource Dazzi keeps; a cold one takes a while. */
const RETRIEVE_TIMEOUT_MS = 120_000;

type SearchState = RetrieveResult | { readonly ok: false; readonly error: "not-installed" };

async function search(query: string, topK: number, signal: AbortSignal | undefined): Promise<SearchState> {
  let app: string;
  try {
    app = await resolveDazziApp();
  } catch (error) {
    if (error instanceof DazziNotFoundError) return { ok: false, error: "not-installed" };
    throw error;
  }
  const result = await run(app, retrieveCliPath(app), retrieveArgs(query, topK), {
    timeoutMs: RETRIEVE_TIMEOUT_MS,
    signal,
  });
  // The program never ran to its own exit (missing, not executable, out of time): say why, not "no results".
  if (result.failure !== undefined) return { ok: false, error: `${result.failure.message} (${result.failure.code})` };
  // The CLI prints its JSON (including `ok: false` errors) on stdout; stderr carries progress and warnings. A crash
  // leaves stdout empty and ends stderr with Node's version footer, so the first error line is the useful one.
  const parsed = parseRetrieveOutput(result.stdout, homedir());
  if (!parsed.ok && result.stdout.trim().length === 0 && result.stderr.trim().length > 0) {
    const lines = result.stderr
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    return { ok: false, error: lines.find((line) => /error/iu.test(line)) ?? lines[0] ?? parsed.error };
  }
  return parsed;
}

function HitActions({ hit, query }: { hit: Hit; query: string }) {
  const question = validateQuestion(query);
  // The first two actions of every panel get Raycast's own ↵ and ⌘↵, which hide a custom shortcut. Ask Dazzi is
  // therefore the third action of every panel, so its ⌘⇧↵ is shown and the same on every kind of result.
  const ask = question.ok ? (
    <Action
      title="Ask Dazzi"
      icon={Icon.SpeechBubble}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "return" },
        Windows: { modifiers: ["ctrl", "shift"], key: "return" },
      }}
      onAction={() => runLauncher(askArgs(question.question, hit.path === undefined ? [] : [hit.path]), "Asked Dazzi")}
    />
  ) : null;
  if (hit.kind === "file" && hit.path !== undefined) {
    const path = hit.path;
    return (
      <ActionPanel>
        <ActionPanel.Section>
          <Action.Open title="Open" target={path} />
          <Action
            title="Show in Dazzi"
            icon={Icon.Finder}
            onAction={() => runLauncher(openArgs([path]), "Shown in Dazzi")}
          />
          {ask}
          <Action.ShowInFinder path={path} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
          <Action.ToggleQuickLook shortcut={Keyboard.Shortcut.Common.ToggleQuickLook} />
        </ActionPanel.Section>
        <ActionPanel.Section>
          <Action.CopyToClipboard title="Copy Path" content={path} shortcut={Keyboard.Shortcut.Common.Copy} />
          <Action.CopyToClipboard title="Copy Excerpt" content={hit.content} />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {hit.url === undefined ? null : <Action.OpenInBrowser url={hit.url} />}
        <Action.CopyToClipboard title="Copy Excerpt" content={hit.content} />
        {hit.url === undefined ? <Action.CopyToClipboard title="Copy Title" content={hit.title} /> : null}
        {ask}
      </ActionPanel.Section>
      {hit.url === undefined ? null : (
        <ActionPanel.Section>
          <Action.CopyToClipboard title="Copy URL" content={hit.url} shortcut={Keyboard.Shortcut.Common.Copy} />
        </ActionPanel.Section>
      )}
    </ActionPanel>
  );
}

/** Search Dazzi: model-free retrieval over everything Dazzi has indexed, run by the app's own librarian CLI. */
export default function Command(props: LaunchProps<{ arguments: Arguments.Search }>) {
  const { topK } = getPreferenceValues<Preferences.Search>();
  const [query, setQuery] = useState(props.arguments.query ?? "");
  const abortable = useRef<AbortController>(null);
  const trimmed = query.trim();
  const { data, isLoading, error, revalidate } = usePromise(
    (text: string, k: number) => search(text, k, abortable.current?.signal),
    [trimmed, Number(topK) || 10],
    {
      abortable,
      execute: trimmed.length > 0,
    },
  );

  const searching = trimmed.length > 0 && isLoading;
  let empty: { title: string; description?: string; icon: Icon; failure?: "not-installed" | "failed" } = {
    title: "Search what Dazzi has indexed",
    description: "Files, mail, chats, and web history",
    icon: Icon.MagnifyingGlass,
  };
  if (error !== undefined)
    empty = { title: "Search failed", description: error.message, icon: Icon.ExclamationMark, failure: "failed" };
  else if (data !== undefined && !data.ok && data.error === "not-installed") {
    empty = {
      title: "Dazzi is not installed",
      description: "Install Dazzi, or set its location in the extension preferences.",
      icon: Icon.ExclamationMark,
      failure: "not-installed",
    };
  } else if (data !== undefined && !data.ok)
    empty = { title: "Search failed", description: data.error, icon: Icon.ExclamationMark, failure: "failed" };
  else if (searching) empty = { title: "Searching…", icon: Icon.MagnifyingGlass };
  else if (trimmed.length > 0 && data?.ok === true && data.hits.length === 0) {
    // Nothing came back because a source failed, not because nothing matched: say which and why.
    const skipped = data.unsearchedReasons[0];
    empty =
      skipped === undefined
        ? { title: "No results", icon: Icon.MagnifyingGlass }
        : {
            title: `Could not search ${skipped.surface}`,
            description: skipped.reason,
            icon: Icon.ExclamationMark,
            failure: "failed",
          };
  }

  const hits = trimmed.length > 0 && data?.ok === true ? data.hits : [];
  const notes =
    data?.ok === true
      ? [
          data.stale ? "index may be stale" : "",
          data.unsearched.length > 0 ? `not searched: ${data.unsearched.join(", ")}` : "",
        ].filter((note) => note.length > 0)
      : [];
  return (
    <List
      isLoading={searching}
      isShowingDetail={hits.length > 0}
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Search files, mail, and chats in Dazzi"
    >
      {hits.length === 0 ? (
        <List.EmptyView
          title={empty.title}
          description={empty.description}
          icon={empty.icon}
          actions={
            empty.failure !== undefined || (trimmed.length > 0 && validateQuestion(trimmed).ok) ? (
              <ActionPanel>
                {empty.failure === "not-installed" ? (
                  <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                ) : null}
                {empty.failure === undefined ? null : (
                  <Action
                    title="Retry"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={revalidate}
                  />
                )}
                {empty.failure === "failed" ? (
                  <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                ) : null}
                {trimmed.length > 0 && validateQuestion(trimmed).ok ? (
                  <Action
                    title="Ask Dazzi"
                    icon={Icon.SpeechBubble}
                    onAction={() => runLauncher(askArgs(trimmed, []), "Asked Dazzi")}
                  />
                ) : null}
              </ActionPanel>
            ) : undefined
          }
        />
      ) : (
        <List.Section title="Results" subtitle={notes.join(" · ") || undefined}>
          {hits.map((hit) => (
            <List.Item
              key={hit.key}
              id={hit.key}
              icon={ICON_BY_KIND[hit.kind]}
              title={hit.title}
              subtitle={hit.subtitle}
              quickLook={hit.path === undefined ? undefined : { path: hit.path, name: hit.title }}
              detail={
                <List.Item.Detail
                  markdown={detailMarkdown(hit)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Source" text={hit.subtitle} />
                      {hit.date === undefined ? null : (
                        <List.Item.Detail.Metadata.Label title="Date" text={hit.date.toLocaleString()} />
                      )}
                      <List.Item.Detail.Metadata.Label title="Found by" text={hit.method} />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={<HitActions hit={hit} query={trimmed} />}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
