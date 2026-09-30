import { useEffect, useMemo, useRef, useState } from "react";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  Keyboard,
  LaunchType,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  launchCommand,
  open,
  openExtensionPreferences,
  showInFinder,
  showToast,
} from "@raycast/api";
import { ENGINE_TITLES, EngineId, EnginePreference, engineSettings, resolveEngine } from "../lib/ai-engines.js";
import { checkEngine } from "../lib/engine-status.js";
import { EngineNotice, useEngineStatus } from "./engine-notice.js";
import { chatKey, deleteChat, findChat, saveChat } from "../lib/chat-store.js";
import { loadVideoContext } from "../lib/context-cache.js";
import { maxHeight } from "../lib/estimate.js";
import { hostOf, safeImageUrl } from "../lib/kinds.js";
import { formatCount, formatUploadDate, qualityName } from "../lib/media-info.js";
import { uniqueFilePath } from "../lib/unique-path.js";
import { ChatTurn, answerQuestion, contextForExport, conversationMarkdown } from "../lib/video-chat.js";
import {
  VideoContext,
  estimateTokens,
  formatTimestamp,
  linkifyTimestamps,
  timestampUrl,
  transcriptText,
  videoStats,
} from "../lib/video-context.js";
import { downloadPath, getffmpegPath, getytdlPath, sanitizeVideoTitle } from "../utils.js";
import Installer from "./installer.js";

/** Opens Chat About Video from the form, the preview, the live view and the history. */
export const CHAT_SHORTCUT: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "a" },
  Windows: { modifiers: ["ctrl", "shift"], key: "a" },
};

const SUGGESTIONS: { title: string; icon: Icon; prompt: string }[] = [
  {
    title: "Summarize the video",
    icon: Icon.Text,
    prompt: "Summarize the video: a two-sentence overview, then the key points with timestamps.",
  },
  {
    title: "Key takeaways",
    icon: Icon.Stars,
    prompt: "What are the most important takeaways? List them with timestamps and why each matters.",
  },
  {
    title: "Chapter-by-chapter breakdown",
    icon: Icon.List,
    prompt:
      "Break the video down section by section (use the chapters if there are any), with a timestamp and a short summary for each.",
  },
  {
    title: "Main arguments and evidence",
    icon: Icon.LightBulb,
    prompt: "What are the main claims or arguments, and what evidence or examples support each? Include timestamps.",
  },
  {
    title: "Notable quotes",
    icon: Icon.QuoteBlock,
    prompt: "Pick the 5 most memorable or important quotes, word for word, with timestamps.",
  },
  {
    title: "Action items and how-tos",
    icon: Icon.CheckList,
    prompt: "List any practical steps, instructions, tools or recommendations mentioned, with timestamps.",
  },
  {
    title: "How is this video performing?",
    icon: Icon.BarChart,
    prompt:
      "Look at the statistics: views, likes, comments, views per day and engagement rates. What do they say about how this video is doing? Be careful not to invent benchmarks.",
  },
  {
    title: "Who is this for?",
    icon: Icon.TwoPeople,
    prompt: "Who is this video for, what should someone know before watching, and is it worth watching in full?",
  },
];

type Turn = ChatTurn & {
  id: string;
  status: "streaming" | "done" | "error" | "stopped";
  engineTitle?: string;
  progress?: string;
  error?: string;
  askedAt: number;
  finishedAt?: number;
};

const TOOL_PATHS: Record<string, () => string> = { "yt-dlp": getytdlPath, ffmpeg: getffmpegPath };

async function saveMarkdown(name: string, content: string, ext = "md") {
  const target = uniqueFilePath(downloadPath, sanitizeVideoTitle(name), ext);
  try {
    fs.writeFileSync(target, content, "utf-8");
    await showToast({
      style: Toast.Style.Success,
      title: "Saved",
      message: path.basename(target),
      primaryAction: { title: "Open", onAction: () => open(target) },
      secondaryAction: { title: "Show in Finder", onAction: () => showInFinder(target) },
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't save",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function overviewMarkdown(ctx: VideoContext): string {
  const v = ctx.video;
  const parts: string[] = [];
  const thumb = safeImageUrl(v.thumbnail ?? undefined);
  if (thumb) parts.push(`![Thumbnail](${thumb})`);
  parts.push(`## ${v.title}`);
  const line = [
    v.uploader ?? v.channel,
    v.duration ? formatTimestamp(v.duration) : undefined,
    formatCount(v.view_count) ? `${formatCount(v.view_count)} views` : undefined,
    formatUploadDate(v.upload_date),
  ].filter(Boolean);
  if (line.length) parts.push(line.join(" · "));
  if (v.chapters?.length) {
    const link = (s: number) => timestampUrl(ctx, s);
    parts.push(
      [
        "### Chapters",
        ...v.chapters.map((c) => linkifyTimestamps(`- [${formatTimestamp(c.start_time)}] ${c.title}`, link)),
      ].join("\n"),
    );
  }
  parts.push(
    ctx.segments.length > 0
      ? `_Transcript loaded: ${ctx.segments.length} segments, about ${formatCount(estimateTokens(transcriptText(ctx.segments)))} tokens${ctx.language ? ` (${ctx.language})` : ""}._`
      : `_${ctx.transcriptNote ? ctx.transcriptNote.replace(/[_*`]/g, "") : "No transcript."} Answers come from the title, description, chapters and statistics. Reload to try again._`,
  );
  if (ctx.segments.length === 0 && ctx.transcriptReason === "language") {
    parts.push(
      "To use the captions in the video's own language, set **Chat: Transcript Language** to `auto` in preferences.",
    );
  }
  return parts.join("\n\n");
}

/** Show text as-is in Markdown, e.g. an error from yt-dlp. */
function codeBlock(text: string): string {
  const fence = "```";
  return `${fence}\n${text.split(fence).join("'''")}\n${fence}`;
}

function turnMarkdown(turn: Turn, ctx: VideoContext | undefined): string {
  const question = `> ${turn.question.replace(/\n/g, "\n> ")}`;
  let body: string;
  if (turn.status === "error") body = `**Couldn't answer.** ${turn.error ?? ""}`;
  else if (!turn.answer) body = `_${turn.progress ?? "Thinking…"}_`;
  else body = ctx ? linkifyTimestamps(turn.answer, (s) => timestampUrl(ctx, s)) : turn.answer;
  const took =
    turn.finishedAt && turn.status === "done"
      ? ` · ${Math.max(1, Math.round((turn.finishedAt - turn.askedAt) / 1000))}s`
      : "";
  const footer =
    turn.status === "stopped"
      ? "\n\n_Stopped._"
      : turn.status === "streaming" && turn.answer && turn.progress
        ? `\n\n_${turn.progress}_`
        : turn.engineTitle && turn.status === "done"
          ? `\n\n---\n_${turn.engineTitle}${took}_`
          : "";
  return `${question}\n\n${body}${footer}`;
}

function turnIcon(turn: Turn) {
  switch (turn.status) {
    case "streaming":
      return { source: Icon.CircleProgress, tintColor: Color.Blue };
    case "error":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    case "stopped":
      return { source: Icon.Stop, tintColor: Color.SecondaryText };
    default:
      return { source: Icon.SpeechBubbleActive, tintColor: Color.Purple };
  }
}

/**
 * Ask anything about one video. Loads its metadata, statistics and timestamped
 * transcript, then answers with the chosen AI engine. The search bar is the
 * question box; answers stream into the detail pane with clickable timestamps.
 */
export function VideoChat({ url, initialQuestion }: { url: string; initialQuestion?: string }) {
  const prefs = useMemo(() => getPreferenceValues<ExtensionPreferences>(), []);
  const settings = useMemo(() => engineSettings(prefs), [prefs]);
  const [refresh, setRefresh] = useState(0);
  const [ctx, setCtx] = useState<VideoContext>();
  const [loadError, setLoadError] = useState<string>();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [searchText, setSearchText] = useState("");
  const [engine, setEngine] = useState<EnginePreference>((prefs.aiEngine as EnginePreference) || "auto");
  const { status: engineStatus, statuses: engineStatuses, recheck: recheckEngines } = useEngineStatus(engine, settings);
  const [selectedId, setSelectedId] = useState<string>();
  const abortRef = useRef<AbortController | null>(null);
  const loadAbort = useRef<AbortController | null>(null);
  // Set when a new answer completes, so the effect below saves the chat once.
  const unsaved = useRef(false);
  const pendingText = useRef(new Map<string, string>());
  const flushTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const missingTool = useMemo(
    () => Object.keys(TOOL_PATHS).find((name) => !fs.existsSync(TOOL_PATHS[name]())),
    [refresh],
  );

  const update = (id: string, patch: Partial<Turn>) =>
    setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  // Streaming can deliver dozens of chunks a second; repaint at most ~12 times a second.
  const streamText = (id: string, text: string) => {
    pendingText.current.set(id, text);
    if (flushTimer.current) return;
    flushTimer.current = setTimeout(() => {
      flushTimer.current = undefined;
      const pending = new Map(pendingText.current);
      pendingText.current.clear();
      setTurns((prev) => prev.map((t) => (pending.has(t.id) ? { ...t, answer: pending.get(t.id) ?? t.answer } : t)));
    }, 80);
  };

  useEffect(() => {
    if (!ctx || !unsaved.current || turns.some((t) => t.status === "streaming")) return;
    unsaved.current = false;
    const done = turns.filter((t) => t.status === "done").reverse();
    if (done.length === 0) return;
    void saveChat({
      key: chatKey(ctx),
      url,
      title: ctx.video.title,
      channel: ctx.video.uploader ?? ctx.video.channel ?? undefined,
      thumbnail: ctx.video.thumbnail ?? undefined,
      updatedAt: Date.now(),
      turns: done.map(({ question, answer }) => ({ question, answer })),
    });
  }, [turns, ctx]);

  async function load(force = false) {
    loadAbort.current?.abort();
    const controller = new AbortController();
    loadAbort.current = controller;
    setLoadError(undefined);
    try {
      const context = await loadVideoContext(url, {
        signal: controller.signal,
        language: prefs.transcriptLanguage,
        force,
      });
      setCtx(context);
      const stored = await findChat(chatKey(context));
      if (stored && !force) {
        setTurns(
          stored.turns
            .map((t, i) => ({ ...t, id: `stored-${i}`, status: "done" as const, askedAt: stored.updatedAt }))
            .reverse(),
        );
      }
      return context;
    } catch (error) {
      if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : String(error));
      return undefined;
    }
  }

  useEffect(() => {
    if (missingTool) return;
    let cancelled = false;
    (async () => {
      const context = await load();
      if (!cancelled && context && initialQuestion) void ask(initialQuestion, context);
    })();
    return () => {
      cancelled = true;
      loadAbort.current?.abort();
      abortRef.current?.abort();
      if (flushTimer.current) clearTimeout(flushTimer.current);
    };
  }, [url, missingTool]);

  const busy = turns.some((t) => t.status === "streaming");

  async function ask(raw: string, context: VideoContext | undefined = ctx) {
    const question = raw.trim();
    if (!question || !context) return;
    if (busy) {
      await showToast({ style: Toast.Style.Failure, title: "Still answering the last question" });
      return;
    }
    const id = randomUUID();
    const history = turns
      .filter((t) => t.status === "done")
      .reverse()
      .map(({ question: q, answer }) => ({ question: q, answer }));
    const controller = new AbortController();
    abortRef.current = controller;
    setTurns((prev) => [{ id, question, answer: "", status: "streaming", askedAt: Date.now() }, ...prev]);
    setSelectedId(id);
    setSearchText("");
    let chosenId: EngineId | undefined;
    try {
      const chosen = await resolveEngine(engine, settings);
      chosenId = chosen.id;
      update(id, { engineTitle: chosen.title });
      const answer = await answerQuestion(chosen, context, question, history, {
        signal: controller.signal,
        onData: (text) => streamText(id, text),
        onStatus: (status) => update(id, { progress: status }),
      });
      if (flushTimer.current) clearTimeout(flushTimer.current);
      flushTimer.current = undefined;
      pendingText.current.delete(id);
      unsaved.current = true;
      update(id, { answer, status: "done", progress: undefined, finishedAt: Date.now() });
    } catch (error) {
      const stopped = controller.signal.aborted;
      let message = error instanceof Error ? error.message : String(error);
      if (!stopped && chosenId) {
        // Say why in the same words as the notice (Ollama stopped, Apple's model
        // still downloading…) rather than the engine's raw error.
        const fresh = await checkEngine(chosenId, settings);
        if (!fresh.ready) message = `${fresh.title}. ${fresh.message}`;
        recheckEngines();
      }
      update(id, {
        status: stopped ? "stopped" : "error",
        progress: undefined,
        error: stopped ? undefined : message,
      });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  async function clearChat() {
    if (!ctx) return;
    const confirmed = await confirmAlert({
      title: "Clear this chat?",
      message: "The saved questions and answers for this video are removed.",
      icon: Icon.Trash,
      primaryAction: { title: "Clear Chat", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    abortRef.current?.abort();
    setTurns([]);
    await deleteChat(chatKey(ctx));
  }

  if (missingTool) {
    return <Installer executable={missingTool} onRefresh={() => setRefresh((r) => r + 1)} />;
  }

  const done = turns.filter((t) => t.status === "done").reverse();
  const engineTitle = turns.find((t) => t.status === "done")?.engineTitle;
  const typed = searchText.trim();
  const title = ctx?.video.title ?? "Chat About Video";
  const stats = ctx ? videoStats(ctx.video) : undefined;
  const best = ctx ? qualityName(maxHeight(ctx.video)) : undefined;

  const engineNoticeShown = !!engineStatus && !engineStatus.ready;
  const loadErrorActions = loadError ? (
    <ActionPanel>
      <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => load(true)} />
      <Action.CopyToClipboard title="Copy Error" content={loadError} />
      <Action.OpenInBrowser title="Open Video" url={url} />
    </ActionPanel>
  ) : null;

  const askTyped = typed ? <Action title="Ask" icon={Icon.Message} onAction={() => ask(typed)} /> : null;

  const commonActions = ctx ? (
    <>
      <ActionPanel.Section>
        {busy && (
          <Action
            title="Stop Answering"
            icon={Icon.Stop}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => abortRef.current?.abort()}
          />
        )}
        {done.length > 0 && (
          <>
            <Action.CopyToClipboard
              title="Copy Conversation"
              content={conversationMarkdown(ctx, done, engineTitle)}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
            <Action
              title="Save Conversation as Markdown"
              icon={Icon.SaveDocument}
              shortcut={Keyboard.Shortcut.Common.Save}
              onAction={() => saveMarkdown(`${ctx.video.title} - Chat`, conversationMarkdown(ctx, done, engineTitle))}
            />
          </>
        )}
        <Action.CopyToClipboard
          title="Copy Video Context for Any AI"
          icon={Icon.Clipboard}
          content={contextForExport(ctx)}
        />
        {ctx.segments.length > 0 && (
          <Action
            title="Save Transcript with Timestamps"
            icon={Icon.Document}
            onAction={() =>
              saveMarkdown(
                `${ctx.video.title} - Transcript`,
                `${ctx.video.title}\n${url}\n\n${transcriptText(ctx.segments)}\n`,
                "txt",
              )
            }
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open Video" url={url} shortcut={Keyboard.Shortcut.Common.Open} />
        <Action
          title="Download Video"
          icon={Icon.Download}
          onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated, context: { url } })}
        />
        <Action
          title="Reload Video Info and Transcript"
          icon={Icon.ArrowClockwise}
          onAction={() => {
            setCtx(undefined);
            void load(true);
          }}
        />
        {turns.length > 0 && (
          <Action
            title="Clear Chat"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.RemoveAll}
            onAction={clearChat}
          />
        )}
      </ActionPanel.Section>
    </>
  ) : null;

  return (
    <List
      isLoading={(!ctx && !loadError) || busy}
      isShowingDetail={!!ctx || (!!engineStatus && !engineStatus.ready)}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={(text) => {
        if (text.trim() && !searchText.trim()) setSelectedId("typed");
        setSearchText(text);
      }}
      searchBarPlaceholder={ctx ? "Ask anything about this video…" : "Fetching the video and its transcript…"}
      navigationTitle={title}
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      searchBarAccessory={
        <List.Dropdown tooltip="AI Engine" value={engine} onChange={(v) => setEngine(v as EnginePreference)}>
          <List.Dropdown.Item value="auto" title="Automatic" icon={Icon.Wand} />
          <List.Dropdown.Section title="Engines">
            {(Object.keys(ENGINE_TITLES) as (keyof typeof ENGINE_TITLES)[]).map((id) => (
              <List.Dropdown.Item key={id} value={id} title={ENGINE_TITLES[id]} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {/* Raycast shows an EmptyView only when the list has no items, so while the
          engine notice is up, the video's loading or error state is an item too. */}
      {engineNoticeShown && !ctx && (
        <List.Section title="Video">
          {loadError ? (
            <List.Item
              id="load-error"
              title="Couldn't load this video"
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
              detail={<List.Item.Detail markdown={`## Couldn't load this video\n\n${codeBlock(loadError)}`} />}
              actions={loadErrorActions}
            />
          ) : (
            <List.Item
              id="loading"
              title="Fetching video details and transcript…"
              subtitle={hostOf(url)}
              icon={Icon.Download}
              detail={
                <List.Item.Detail markdown={`Fetching the video's details and transcript from ${hostOf(url)}…`} />
              }
            />
          )}
        </List.Section>
      )}
      <EngineNotice
        status={engineStatus}
        statuses={engineStatuses}
        onRetry={recheckEngines}
        onSwitch={(id) => setEngine(id)}
      />
      {!engineNoticeShown &&
        (loadError ? (
          <List.EmptyView
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
            title="Couldn't load this video"
            description={loadError}
            actions={loadErrorActions}
          />
        ) : !ctx ? (
          <List.EmptyView
            icon={Icon.Download}
            title="Fetching video details and transcript…"
            description={hostOf(url)}
          />
        ) : null)}

      {ctx && turns.length > 0 && (
        <List.Section title="Conversation" subtitle={String(turns.length)}>
          {turns.map((turn) => (
            <List.Item
              key={turn.id}
              id={turn.id}
              title={turn.question}
              icon={turnIcon(turn)}
              detail={<List.Item.Detail markdown={turnMarkdown(turn, ctx)} />}
              actions={
                <ActionPanel>
                  {askTyped}
                  {turn.status === "done" && (
                    <Action.CopyToClipboard
                      title="Copy Answer"
                      content={turn.answer}
                      shortcut={Keyboard.Shortcut.Common.Copy}
                    />
                  )}
                  {turn.status !== "streaming" && (
                    <Action
                      title="Ask Again"
                      icon={Icon.RotateClockwise}
                      shortcut={Keyboard.Shortcut.Common.Refresh}
                      onAction={() => ask(turn.question)}
                    />
                  )}
                  <Action
                    title="Edit Question"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    onAction={() => setSearchText(turn.question)}
                  />
                  {turn.error && <Action.CopyToClipboard title="Copy Error" content={turn.error} />}
                  {commonActions}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {ctx && (
        <List.Section title={turns.length > 0 ? "Ask Next" : "Suggestions"}>
          {typed && (
            <List.Item
              id="typed"
              title={`Ask: ${typed}`}
              icon={Icon.Message}
              detail={<List.Item.Detail markdown={`> ${typed}\n\nPress **↵** to ask.`} />}
              actions={
                <ActionPanel>
                  {askTyped}
                  {commonActions}
                </ActionPanel>
              }
            />
          )}
          {SUGGESTIONS.map((s) => (
            <List.Item
              key={s.title}
              id={`suggestion-${s.title}`}
              title={s.title}
              icon={s.icon}
              detail={
                <List.Item.Detail markdown={`> ${s.prompt}\n\nPress **↵** to ask this, or type your own question.`} />
              }
              actions={
                <ActionPanel>
                  {askTyped}
                  <Action title="Ask This" icon={Icon.Message} onAction={() => ask(s.prompt)} />
                  <Action
                    title="Edit Before Asking"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    onAction={() => setSearchText(s.prompt)}
                  />
                  {commonActions}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {ctx && (
        <List.Section title="Video">
          <List.Item
            id="about"
            title="About This Video"
            icon={Icon.Info}
            detail={
              <List.Item.Detail
                markdown={overviewMarkdown(ctx)}
                metadata={
                  <List.Item.Detail.Metadata>
                    {(ctx.video.uploader ?? ctx.video.channel) && (
                      <List.Item.Detail.Metadata.Label
                        title="Channel"
                        text={String(ctx.video.uploader ?? ctx.video.channel)}
                        icon={ctx.video.channel_is_verified ? Icon.CheckCircle : Icon.Person}
                      />
                    )}
                    {formatCount(ctx.video.channel_follower_count) && (
                      <List.Item.Detail.Metadata.Label
                        title="Subscribers"
                        text={formatCount(ctx.video.channel_follower_count)}
                      />
                    )}
                    {ctx.video.duration ? (
                      <List.Item.Detail.Metadata.Label title="Duration" text={formatTimestamp(ctx.video.duration)} />
                    ) : null}
                    {formatUploadDate(ctx.video.upload_date) && (
                      <List.Item.Detail.Metadata.Label
                        title="Uploaded"
                        text={formatUploadDate(ctx.video.upload_date)}
                      />
                    )}
                    {best && <List.Item.Detail.Metadata.Label title="Best Quality" text={best} />}
                    <List.Item.Detail.Metadata.Separator />
                    {formatCount(ctx.video.view_count) && (
                      <List.Item.Detail.Metadata.Label title="Views" text={formatCount(ctx.video.view_count)} />
                    )}
                    {formatCount(ctx.video.like_count) && (
                      <List.Item.Detail.Metadata.Label title="Likes" text={formatCount(ctx.video.like_count)} />
                    )}
                    {formatCount(ctx.video.comment_count) && (
                      <List.Item.Detail.Metadata.Label title="Comments" text={formatCount(ctx.video.comment_count)} />
                    )}
                    {stats?.viewsPerDay !== undefined && (
                      <List.Item.Detail.Metadata.Label
                        title="Views per Day"
                        text={formatCount(Math.round(stats.viewsPerDay))}
                      />
                    )}
                    {stats?.likeRate !== undefined && (
                      <List.Item.Detail.Metadata.Label title="Likes per 100 Views" text={stats.likeRate.toFixed(2)} />
                    )}
                    {stats?.commentsPer1kViews !== undefined && (
                      <List.Item.Detail.Metadata.Label
                        title="Comments per 1K Views"
                        text={stats.commentsPer1kViews.toFixed(2)}
                      />
                    )}
                    {ctx.video.tags?.length ? (
                      <List.Item.Detail.Metadata.TagList title="Tags">
                        {ctx.video.tags.slice(0, 6).map((tag) => (
                          <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    ) : null}
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Link title="Video" text={hostOf(url)} target={url} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                {askTyped}
                {ctx.segments.length === 0 && ctx.transcriptReason === "language" && (
                  <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                )}
                <Action.OpenInBrowser title="Open Video" url={url} />
                <Action.CopyToClipboard
                  title="Copy Statistics"
                  content={[
                    ctx.video.title,
                    formatCount(ctx.video.view_count) && `Views: ${formatCount(ctx.video.view_count)}`,
                    formatCount(ctx.video.like_count) && `Likes: ${formatCount(ctx.video.like_count)}`,
                    formatCount(ctx.video.comment_count) && `Comments: ${formatCount(ctx.video.comment_count)}`,
                    stats?.viewsPerDay !== undefined && `Views per day: ${formatCount(Math.round(stats.viewsPerDay))}`,
                  ]
                    .filter(Boolean)
                    .join("\n")}
                />
                {commonActions}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
