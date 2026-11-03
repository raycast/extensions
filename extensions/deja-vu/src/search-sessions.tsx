import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { execFile } from "node:child_process";
import React, { useEffect, useState } from "react";
import {
  DejaSessionHit,
  parseLastJSON,
  parseResumeOutput,
  parseSearchJSON,
  parseShowJSON,
  quoteConversationMarkdown,
  runDeja,
} from "./lib/deja";
import { locateDeja } from "./lib/locate";

function runInTerminalApp(cmd: string) {
  const script = `tell application "Terminal"\nactivate\ndo script ${JSON.stringify(cmd)}\nend tell`;
  execFile("/usr/bin/osascript", ["-e", script]);
}

function SessionDetail({ bin, hit }: { bin: string; hit: DejaSessionHit }) {
  const [md, setMd] = useState<string>("Loading session…");
  useEffect(() => {
    const args = ["show", hit.id, "--json", "--limit", "200"];
    if (hit.harness) args.push("--harness", hit.harness);
    runDeja(bin, args)
      .then((out) => setMd(quoteConversationMarkdown(parseShowJSON(out))))
      .catch((err) => setMd(`Failed to load session: ${String(err)}`));
  }, [bin, hit.id, hit.harness]);
  return <Detail markdown={md} />;
}

export function SessionActions({ bin, hit }: { bin: string; hit: DejaSessionHit }) {
  const resolveResume = async () => {
    const args = ["resume", hit.id];
    if (hit.harness) args.push("--harness", hit.harness);
    const out = await runDeja(bin, args);
    return parseResumeOutput(out);
  };
  return (
    <ActionPanel>
      <Action.Push title="Show Session" icon={Icon.Eye} target={<SessionDetail bin={bin} hit={hit} />} />
      <Action
        title="Resume in Terminal"
        icon={Icon.Terminal}
        onAction={async () => {
          try {
            const { command } = await resolveResume();
            if (!command) throw new Error("No resume command available for this harness");
            runInTerminalApp(command);
          } catch (e) {
            await showToast({ style: Toast.Style.Failure, title: "Cannot resume session", message: String(e) });
          }
        }}
      />
      <Action.CopyToClipboard title="Copy Session ID" content={hit.id} />
      <Action
        title="Copy Resume Command"
        icon={Icon.Clipboard}
        onAction={async () => {
          const { command } = await resolveResume();
          if (command) {
            execFile("/usr/bin/pbcopy", []).stdin?.end(command);
            await showToast({ style: Toast.Style.Success, title: "Copied resume command" });
          }
        }}
      />
      <Action
        title="Open Project Folder"
        icon={Icon.Folder}
        onAction={async () => {
          const { cwd } = await resolveResume();
          if (cwd) execFile("/usr/bin/open", [cwd]);
        }}
      />
    </ActionPanel>
  );
}

export default function SearchSessionsCommand() {
  const prefs = getPreferenceValues<{ dejaPath?: string }>();
  const bin = locateDeja(prefs.dejaPath);
  const [query, setQuery] = useState("");
  const [strictHits, setStrictHits] = useState<DejaSessionHit[]>([]);
  const [nearestHits, setNearestHits] = useState<DejaSessionHit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bin) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const q = query.trim();
    const run = q
      ? runDeja(bin, ["search", "--json", "--limit", "25", "--", q]).then((out) => {
          const env = parseSearchJSON(out);
          if (!cancelled) {
            setStrictHits(env.strictHits);
            setNearestHits(env.nearestHits);
          }
        })
      : runDeja(bin, ["last", "30", "--json"]).then((out) => {
          if (!cancelled) {
            setStrictHits(parseLastJSON(out));
            setNearestHits([]);
          }
        });
    run
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bin, query]);

  if (!bin) {
    return (
      <List>
        <List.EmptyView
          title="deja binary not found"
          description="Install deja-vu with Homebrew (brew install deja-vu) or set its path in Extension Preferences."
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Homebrew Install Command"
                content="brew install deja-vu && deja install --auto"
              />
              <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={loading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search across Claude Code, Codex, Cursor, OpenCode…"
      throttle
    >
      <List.Section title={query.trim() ? "Matching Sessions" : "Recent Sessions"}>
        {strictHits.map((hit) => (
          <List.Item
            key={`${hit.harness}:${hit.id}`}
            title={hit.title || hit.snippet || hit.id}
            subtitle={hit.project}
            accessories={[{ tag: hit.harness }, { text: hit.updated || hit.started || "" }]}
            actions={<SessionActions bin={bin} hit={hit} />}
          />
        ))}
      </List.Section>
      {nearestHits.length > 0 && (
        <List.Section title="Nearest Sessions (Relevance)">
          {nearestHits.map((hit) => (
            <List.Item
              key={`near:${hit.harness}:${hit.id}`}
              title={hit.title || hit.snippet || hit.id}
              subtitle={hit.project}
              accessories={[{ tag: hit.harness }, { text: hit.updated || hit.started || "" }]}
              actions={<SessionActions bin={bin} hit={hit} />}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
