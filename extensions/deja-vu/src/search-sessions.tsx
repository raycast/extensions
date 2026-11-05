import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { runAppleScript, showFailureToast, usePromise } from "@raycast/utils";
import React, { useState } from "react";
import {
  DejaSessionHit,
  parseLastJSON,
  parseResumeOutput,
  parseSearchJSON,
  parseShowJSON,
  quoteConversationMarkdown,
  runDeja,
  SearchResultEnvelope,
} from "./lib/deja";
import { locateDeja } from "./lib/locate";

async function runInTerminalApp(cmd: string) {
  await runAppleScript(
    `on run argv
  tell application "Terminal"
    activate
    do script (item 1 of argv)
  end tell
end run`,
    [cmd],
  );
}

function SessionDetail({ bin, hit }: { bin: string; hit: DejaSessionHit }) {
  const { data, isLoading, error, revalidate } = usePromise(
    async (binPath: string, id: string, harness?: string) => {
      const args = ["show", id, "--json", "--limit", "200"];
      if (harness) args.push("--harness", harness);
      const out = await runDeja(binPath, args);
      return quoteConversationMarkdown(parseShowJSON(out));
    },
    [bin, hit.id, hit.harness],
  );

  return (
    <Detail
      isLoading={isLoading}
      markdown={error ? `Failed to load session: ${String(error)}` : (data ?? "")}
      actions={
        <ActionPanel>
          <Action title="Reload Session" icon={Icon.ArrowClockwise} onAction={revalidate} />
        </ActionPanel>
      }
    />
  );
}

export function SessionActions({ bin, hit }: { bin: string; hit: DejaSessionHit }) {
  async function resolveResume(): Promise<string> {
    const out = await runDeja(bin, ["resume", hit.id]);
    const parsed = parseResumeOutput(out);
    if (!parsed) throw new Error(out.trim() || `No resume command for ${hit.id}`);
    return parsed.command;
  }

  return (
    <ActionPanel>
      <Action.Push title="Show Session" icon={Icon.Eye} target={<SessionDetail bin={bin} hit={hit} />} />
      <Action
        title="Resume in Terminal"
        icon={Icon.Terminal}
        onAction={async () => {
          try {
            const cmd = await resolveResume();
            await runInTerminalApp(cmd);
            await showToast({ style: Toast.Style.Success, title: "Launched in Terminal", message: cmd });
          } catch (e) {
            await showFailureToast(e, { title: "Cannot resume session" });
          }
        }}
      />
      <Action
        title="Copy Resume Command"
        icon={Icon.Clipboard}
        shortcut={Keyboard.Shortcut.Common.Copy}
        onAction={async () => {
          try {
            const cmd = await resolveResume();
            await Clipboard.copy(cmd);
            await showToast({ style: Toast.Style.Success, title: "Copied resume command", message: cmd });
          } catch (e) {
            await showFailureToast(e, { title: "Cannot copy resume command" });
          }
        }}
      />
      <Action.CopyToClipboard title="Copy Session ID" content={hit.id} shortcut={Keyboard.Shortcut.Common.CopyName} />
      {hit.project ? (
        <Action
          title="Open Project Folder"
          icon={Icon.Folder}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={async () => {
            try {
              await open(hit.project!);
            } catch (e) {
              await showFailureToast(e, { title: "Cannot open project folder" });
            }
          }}
        />
      ) : null}
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel>
  );
}

export default function SearchSessionsCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const bin = locateDeja(prefs.dejaPath);
  const [query, setQuery] = useState("");

  const { data, isLoading, error, revalidate } = usePromise(
    async (binPath: string, q: string): Promise<SearchResultEnvelope> => {
      const trimmed = q.trim();
      if (!trimmed) {
        const out = await runDeja(binPath, ["last", "30", "--json"]);
        return { tier: "exact", strictHits: parseLastJSON(out), nearestHits: [] };
      }
      const out = await runDeja(binPath, ["search", "--json", "--limit", "25", "--", trimmed]);
      return parseSearchJSON(out);
    },
    [bin ?? "", query],
    { execute: Boolean(bin) },
  );

  if (!bin) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="deja binary not found"
          description="Install deja-vu with `brew install deja-vu && deja install --auto` or set its path in Extension Preferences."
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Homebrew Install Command"
                content="brew install deja-vu && deja install --auto"
              />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const strict = data?.strictHits ?? [];
  const fallback = data?.nearestHits ?? [];

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search across Claude Code, Codex, Cursor, OpenCode, Gemini CLI…"
      throttle
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load sessions"
          description={String(error)}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : null}
      <List.Section title={query.trim() ? "Matches" : "Recent Sessions"} subtitle={`${strict.length}`}>
        {strict.map((h) => (
          <List.Item
            key={`${h.harness}:${h.id}`}
            title={h.title || h.snippet || h.id}
            subtitle={h.project || ""}
            accessories={[
              ...(h.harness ? [{ tag: h.harness }] : []),
              ...(h.updated ? [{ text: h.updated.slice(0, 10) }] : []),
            ]}
            actions={<SessionActions bin={bin} hit={h} />}
          />
        ))}
      </List.Section>
      {fallback.length > 0 ? (
        <List.Section title="Nearest Sessions (Relevance)" subtitle={`${fallback.length}`}>
          {fallback.map((h) => (
            <List.Item
              key={`fb:${h.harness}:${h.id}`}
              title={h.title || h.snippet || h.id}
              subtitle={h.project || ""}
              accessories={[
                ...(h.harness ? [{ tag: h.harness }] : []),
                ...(h.updated ? [{ text: h.updated.slice(0, 10) }] : []),
              ]}
              actions={<SessionActions bin={bin} hit={h} />}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
