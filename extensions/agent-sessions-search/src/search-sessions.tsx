import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  List,
  Toast,
  closeMainWindow,
  showToast,
  launchCommand,
  LaunchType,
  getPreferenceValues,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, useLocalStorage } from "@raycast/utils";
import { existsSync } from "node:fs";
import { useEffect, useMemo, useRef, useState } from "react";
import { countSessions, getMeta } from "./lib/db";
import { projectLabel } from "./lib/git";
import { runIndex } from "./lib/index-runner";
import { configureFromPreferences } from "./lib/raycast-config";
import {
  appDeepLink,
  appName,
  fullTerminalCommand,
  openInApp,
  openInTerminal,
  preferredTarget,
  workingDirectory,
} from "./lib/resume";
import { refreshClaudeDesktopState } from "./lib/desktop";
import { linearUrl, prUrl } from "./lib/links";
import { searchSessions } from "./lib/search";
import { AGENT_LABELS, AgentId, SessionHit } from "./lib/types";

type AgentFilter = AgentId | "all";

configureFromPreferences();

/** Real app icons when the apps are installed (macOS file icons), bundled fallbacks otherwise. */
function appIcon(candidates: string[], fallback: string): Image.ImageLike {
  const app = candidates.find((p) => existsSync(p));
  return app ? { fileIcon: app } : { source: fallback };
}

const AGENT_ICON: Record<AgentId, Image.ImageLike> = {
  claude: appIcon(["/Applications/Claude.app"], "claude.png"),
  codex: appIcon(["/Applications/Codex.app", "/Applications/ChatGPT.app"], "codex.png"),
};

function formatDate(ts: number | null): string {
  if (!ts) return "unknown";
  return new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function useIndexBootstrap(onChanged: () => void) {
  const [status, setStatus] = useState<{ indexing: boolean; progress?: string }>({ indexing: false });
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      let toast: Toast | null = null;
      try {
        const firstRun = countSessions() === 0;
        if (firstRun) {
          toast = await showToast({ style: Toast.Style.Animated, title: "Indexing sessions for the first time…" });
        }
        setStatus({ indexing: true });
        let lastRefresh = Date.now();
        const summary = await runIndex({
          mode: "refresh",
          onProgress: (p) => {
            const msg = `${p.done}/${p.total}`;
            setStatus({ indexing: true, progress: msg });
            if (toast) toast.message = msg;
            if (Date.now() - lastRefresh > 2500) {
              lastRefresh = Date.now();
              onChanged();
            }
          },
        });
        if (toast) {
          toast.style = Toast.Style.Success;
          toast.title = `Indexed ${summary.indexed} sessions`;
          toast.message = `${(summary.durationMs / 1000).toFixed(1)}s`;
        }
        if (summary.indexed > 0 || summary.removed > 0) onChanged();
      } catch (e) {
        await showFailureToast(e, { title: "Indexing failed" });
      } finally {
        setStatus({ indexing: false });
      }
    })();
  }, []);
  return status;
}

export default function Command() {
  const [query, setQuery] = useState("");
  const [agent, setAgent] = useState<AgentFilter>("all");
  const { value: showDetail = true, setValue: setShowDetail } = useLocalStorage<boolean>("showDetail", true);
  const { data, isLoading, revalidate } = useCachedPromise(
    async (q: string, a: AgentFilter) => searchSessions(q, { agent: a, limit: 80 }),
    [query, agent],
    { keepPreviousData: true },
  );
  const indexStatus = useIndexBootstrap(() => revalidate());
  // Pin/archive state lives in Claude Desktop's metadata, not in the index: refresh it off the
  // render path and re-query when it changed (first open, or the user pinned/archived something).
  useEffect(() => {
    let cancelled = false;
    refreshClaudeDesktopState().then((changed) => {
      if (changed && !cancelled) revalidate();
    });
    return () => {
      cancelled = true;
    };
  }, [query, agent]);
  const hits = data ?? [];
  // Always land on the top-ranked hit when results change so Enter resumes the first result.
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  useEffect(() => {
    setSelectedItemId(hits[0]?.id);
  }, [data]);
  const lastIndexed = useMemo(() => getMeta("lastIndexedAt"), [indexStatus.indexing]);

  return (
    <List
      isLoading={isLoading || indexStatus.indexing}
      filtering={false}
      throttle
      isShowingDetail={showDetail && hits.length > 0}
      searchBarPlaceholder="Search sessions: PR 832, ZAP-1793, branch, file, or any text…"
      onSearchTextChange={setQuery}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
      searchBarAccessory={
        <List.Dropdown tooltip="Agent" storeValue onChange={(v) => setAgent(v as AgentFilter)}>
          <List.Dropdown.Item title="All agents" value="all" icon={Icon.Layers} />
          <List.Dropdown.Item title="Claude Code" value="claude" icon={AGENT_ICON.claude} />
          <List.Dropdown.Item title="Codex" value="codex" icon={AGENT_ICON.codex} />
        </List.Dropdown>
      }
    >
      {hits.length === 0 ? (
        <List.EmptyView
          icon={indexStatus.indexing ? Icon.Hourglass : Icon.MagnifyingGlass}
          title={
            indexStatus.indexing
              ? `Indexing sessions… ${indexStatus.progress ?? ""}`
              : query
                ? "No matching sessions"
                : "No sessions indexed yet"
          }
          description={
            query
              ? "Try a PR number, a Linear key, a branch name, a filename or a phrase."
              : lastIndexed
                ? undefined
                : "Run “Rebuild Sessions Index” if your sessions live in a custom location."
          }
        />
      ) : (
        groupByProject(hits).map((group) => (
          <List.Section key={group.key} title={group.title} subtitle={`${group.hits.length}`}>
            {group.hits.map((hit) => (
              <SessionItem
                key={hit.id}
                hit={hit}
                query={query}
                onRefresh={revalidate}
                showDetail={showDetail}
                onToggleDetail={() => setShowDetail(!showDetail)}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

/** Group hits by project, sections ordered by their best-ranked hit so ranking stays visible. */
function groupByProject(hits: SessionHit[]): { key: string; title: string; hits: SessionHit[] }[] {
  const groups = new Map<string, { key: string; title: string; hits: SessionHit[] }>();
  for (const hit of hits) {
    const key = hit.repo ?? projectLabel(hit.repo, hit.cwd);
    let g = groups.get(key);
    if (!g) groups.set(key, (g = { key, title: hit.repo ?? projectLabel(hit.repo, hit.cwd), hits: [] }));
    g.hits.push(hit);
  }
  return [...groups.values()];
}

function SessionItem({
  hit,
  query,
  onRefresh,
  showDetail,
  onToggleDetail,
}: {
  hit: SessionHit;
  query: string;
  onRefresh: () => void;
  showDetail: boolean;
  onToggleDetail: () => void;
}) {
  const project = projectLabel(hit.repo, hit.cwd);
  const worktreeBranch = hit.branch && hit.branch !== "HEAD" && hit.branch !== "main" && hit.branch !== "master";
  const accessories: List.Item.Accessory[] = [];
  if (hit.pinned)
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Pinned in Claude Desktop" });
  if (hit.archived)
    accessories.push({ icon: { source: Icon.Tray, tintColor: Color.SecondaryText }, tooltip: "Archived" });
  if (hit.prNumbers.length > 0) {
    accessories.push({
      tag: { value: `#${hit.prNumbers[0]}`, color: Color.Purple },
      tooltip: `PR #${hit.prNumbers.join(", #")}`,
    });
  }
  if (hit.updatedAt)
    accessories.push({ date: new Date(hit.updatedAt), tooltip: `Last activity ${formatDate(hit.updatedAt)}` });

  const target = preferredTarget(hit);
  const primary =
    target === "app" ? (
      <Action title={`Open in ${appName(hit)}`} icon={Icon.AppWindow} onAction={() => resume(hit, "app")} />
    ) : (
      <Action title="Resume in Terminal" icon={Icon.Terminal} onAction={() => resume(hit, "terminal")} />
    );
  const secondary =
    target === "app" ? (
      <Action title="Resume in Terminal" icon={Icon.Terminal} onAction={() => resume(hit, "terminal")} />
    ) : (
      <Action title={`Open in ${appName(hit)}`} icon={Icon.AppWindow} onAction={() => resume(hit, "app")} />
    );

  return (
    <List.Item
      id={hit.id}
      icon={{ value: AGENT_ICON[hit.agent], tooltip: AGENT_LABELS[hit.agent] }}
      title={hit.title}
      subtitle={worktreeBranch ? { value: hit.branch ?? "", tooltip: "Branch" } : undefined}
      keywords={[hit.sessionId, hit.branch ?? "", project]}
      accessories={accessories}
      detail={<SessionDetail hit={hit} query={query} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Resume">
            {primary}
            {secondary}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Resume Command"
              content={fullTerminalCommand(hit)}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Session ID"
              content={hit.sessionId}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            <Action.CopyToClipboard title="Copy Deep Link" content={appDeepLink(hit)} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Links">
            {hit.prNumbers.map((n, i) => {
              const url = prUrl(hit, n);
              return url ? (
                <Action.OpenInBrowser
                  key={n}
                  title={`Open PR #${n} on GitHub`}
                  url={url}
                  shortcut={i === 0 ? { modifiers: ["cmd"], key: "g" } : undefined}
                />
              ) : null;
            })}
            {hit.linearKeys.map((k, i) => {
              const url = linearUrl(k);
              return url ? (
                <Action.OpenInBrowser
                  key={k}
                  title={`Open ${k} in Linear`}
                  url={url}
                  shortcut={i === 0 ? { modifiers: ["cmd"], key: "l" } : undefined}
                />
              ) : null;
            })}
          </ActionPanel.Section>
          <ActionPanel.Section title="Files">
            {hit.cwd && (
              <Action.ShowInFinder
                title="Show Project in Finder"
                path={workingDirectory(hit)}
                shortcut={{ modifiers: ["cmd"], key: "f" }}
              />
            )}
            {hit.cwd && (
              <Action.Open
                title="Open Project in Editor"
                target={workingDirectory(hit)}
                shortcut={Keyboard.Shortcut.Common.Edit}
              />
            )}
            <Action.ShowInFinder title="Show Transcript File" path={hit.file} />
          </ActionPanel.Section>
          <ActionPanel.Section title="View">
            <Action
              title={showDetail ? "Hide Details" : "Show Details"}
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={onToggleDetail}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Index">
            <Action
              title="Refresh Index"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={async () => {
                const toast = await showToast({ style: Toast.Style.Animated, title: "Refreshing index…" });
                try {
                  const s = await runIndex({
                    mode: "refresh",
                    onProgress: (p) => (toast.message = `${p.done}/${p.total}`),
                  });
                  toast.style = Toast.Style.Success;
                  toast.title = s.indexed === 0 ? "Index up to date" : `Indexed ${s.indexed} sessions`;
                  toast.message = undefined;
                  onRefresh();
                } catch (e) {
                  await showFailureToast(e, { title: "Refresh failed" });
                }
              }}
            />
            <Action
              title="Rebuild Index from Scratch"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => launchCommand({ name: "rebuild-index", type: LaunchType.UserInitiated })}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

async function resume(hit: SessionHit, target: "app" | "terminal") {
  try {
    if (target === "app") await openInApp(hit);
    else await openInTerminal(hit);
    await closeMainWindow({ clearRootSearch: false });
  } catch (e) {
    await showFailureToast(e, {
      title:
        target === "app"
          ? `Could not open ${appName(hit)}`
          : `Could not launch ${getPreferenceValues<Preferences>().terminalApp}`,
    });
  }
}

function SessionDetail({ hit, query }: { hit: SessionHit; query: string }) {
  const md: string[] = [`## ${hit.title}`];
  if (hit.snippet) md.push(`> ${hit.snippet.replace(/\n+/g, " ")}`);
  else if (hit.firstPrompt) md.push(`> ${hit.firstPrompt}`);
  if (hit.lastPrompt && hit.lastPrompt !== hit.firstPrompt) md.push(`**Last prompt:** ${hit.lastPrompt}`);
  if (query && hit.why.length > 0) md.push(`_Why:_ ${[...new Set(hit.why)].join(" · ")}`);
  const links = [
    ...hit.prNumbers.map((n) => {
      const url = prUrl(hit, n);
      return url ? `[PR #${n}](${url})` : `PR #${n}`;
    }),
    ...hit.linearKeys.map((k) => {
      const url = linearUrl(k);
      return url ? `[${k}](${url})` : k;
    }),
  ];
  if (links.length > 0) md.push(links.join(" · "));

  return (
    <List.Item.Detail
      markdown={md.join("\n\n")}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Agent" text={AGENT_LABELS[hit.agent]} icon={AGENT_ICON[hit.agent]} />
          <List.Item.Detail.Metadata.Label title="Project" text={hit.repo ?? projectLabel(hit.repo, hit.cwd)} />
          {hit.branch && <List.Item.Detail.Metadata.Label title="Branch" text={hit.branch} icon={Icon.Code} />}
          {hit.prNumbers.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Pull requests">
              {hit.prNumbers.map((n) => (
                <List.Item.Detail.Metadata.TagList.Item key={n} text={`#${n}`} color={Color.Purple} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          {hit.linearKeys.length > 0 && (
            <List.Item.Detail.Metadata.TagList title="Issues">
              {hit.linearKeys.map((k) => (
                <List.Item.Detail.Metadata.TagList.Item key={k} text={k} color={Color.Blue} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          )}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Created" text={formatDate(hit.createdAt)} />
          <List.Item.Detail.Metadata.Label title="Last activity" text={formatDate(hit.updatedAt)} />
          <List.Item.Detail.Metadata.Label title="Messages" text={String(hit.messageCount)} />
          {hit.entrypoint && <List.Item.Detail.Metadata.Label title="Started from" text={hit.entrypoint} />}
          {hit.pinned && (
            <List.Item.Detail.Metadata.Label title="Pinned" text="Claude Desktop sidebar" icon={Icon.Star} />
          )}
          {hit.archived && <List.Item.Detail.Metadata.Label title="Archived" text="yes" icon={Icon.Tray} />}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Directory" text={hit.cwd ?? "unknown"} />
          <List.Item.Detail.Metadata.Label title="Session ID" text={hit.sessionId} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
