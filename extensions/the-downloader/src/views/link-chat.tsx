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
  environment,
  getPreferenceValues,
  launchCommand,
  open,
  openCommandPreferences,
  openExtensionPreferences,
  showInFinder,
  showToast,
} from "@raycast/api";
import { ENGINE_TITLES, EngineId, EnginePreference, engineSettings, resolveEngine } from "../lib/ai-engines.js";
import { checkEngine } from "../lib/engine-status.js";
import { EngineNotice, useEngineStatus } from "./engine-notice.js";
import { chatKey, deleteChat, findChat, saveChat } from "../lib/chat-store.js";
import { maxHeight } from "../lib/estimate.js";
import { hostOf, safeImageUrl } from "../lib/kinds.js";
import { ChatTurn, answerQuestion, bodyForSave, contextForExport, conversationMarkdown } from "../lib/link-chat.js";
import {
  LinkContext,
  LinkKind,
  LinkLoadError,
  bodyText,
  estimateTokens,
  formatTimestamp,
  hasBody,
  linkifyTimestamps,
} from "../lib/link-context.js";
import { fetchImages, imageDecision, imageQuestion } from "../lib/link-images.js";
import { linkKindOf, loadLinkContext } from "../lib/link-loader.js";
import { formatCount, qualityName } from "../lib/media-info.js";
import { timestampUrl } from "../lib/sources/video.js";
import { uniqueFilePath } from "../lib/unique-path.js";
import { downloadPath, getGalleryDlPath, getffmpegPath, getytdlPath, sanitizeVideoTitle } from "../utils.js";
import Installer from "./installer.js";

type Suggestion = { title: string; icon: Icon; prompt: string };

const SUGGESTIONS: Record<LinkKind, Suggestion[]> = {
  video: [
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
  ],
  post: [
    { title: "What is this post about?", icon: Icon.Text, prompt: "What is this post about? Explain it briefly." },
    {
      title: "Translate the caption",
      icon: Icon.Globe,
      prompt: "Translate the caption into English (or into my language if I wrote in another one), keeping its tone.",
    },
    {
      title: "Explain the hashtags",
      icon: Icon.Hashtag,
      prompt: "Explain what each hashtag in this post refers to and why it's used here.",
    },
    {
      title: "How is this post doing?",
      icon: Icon.BarChart,
      prompt: "Look at the likes, comments and other numbers. What do they say about how this post is doing?",
    },
  ],
  page: [
    {
      title: "Summarize this article",
      icon: Icon.Text,
      prompt: "Summarize this article: a two-sentence overview, then the key points.",
    },
    {
      title: "What are the key takeaways?",
      icon: Icon.Stars,
      prompt: "What are the key takeaways? List them and say why each matters.",
    },
    {
      title: "What's the author's argument?",
      icon: Icon.LightBulb,
      prompt: "What is the author arguing, and what evidence or examples do they give for it?",
    },
    {
      title: "Explain it simply",
      icon: Icon.Bubble,
      prompt: "Explain this article in simple words, as if to someone new to the topic.",
    },
  ],
};

/** Words for each kind of link, used across the screen. */
const WORDS: Record<LinkKind, { noun: string; loading: string; about: string; download: string }> = {
  video: {
    noun: "video",
    loading: "Fetching the video's details and transcript",
    about: "About This Video",
    download: "Download Video",
  },
  post: { noun: "post", loading: "Reading the post", about: "About This Post", download: "Download Images" },
  page: { noun: "page", loading: "Reading the page", about: "About This Page", download: "Save Page" },
};

/** The tools each kind of link is read with; a missing one opens the installer. */
const TOOL_PATHS: Record<LinkKind, Record<string, () => string>> = {
  video: { "yt-dlp": getytdlPath, ffmpeg: getffmpegPath },
  post: { "gallery-dl": getGalleryDlPath },
  page: {},
};

type Turn = ChatTurn & {
  id: string;
  status: "streaming" | "done" | "error" | "stopped";
  engineTitle?: string;
  progress?: string;
  error?: string;
  askedAt: number;
  finishedAt?: number;
};

type LoadError = { message: string; fix?: "preferences" | "archive" };

async function saveFile(name: string, content: string, ext: string) {
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

/** `2026-09-28` → a localized date. */
function formatDate(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

const stat = (ctx: LinkContext, label: string) => ctx.stats.find((s) => s.label === label)?.value;
const fact = (ctx: LinkContext, label: string) => ctx.facts.find((f) => f.label === label)?.value;

function bodySummary(ctx: LinkContext): string {
  if (!hasBody(ctx)) {
    const note = (ctx.note ?? "Nothing to read.").replace(/[_*`]/g, "");
    const from =
      ctx.kind === "video" ? "the title, description, chapters and statistics" : "the title, description and details";
    const archive = ctx.noteReason === "unreadable" && !ctx.archive ? ", or read the Internet Archive's copy (⌘K)" : "";
    return `_${note} Answers come from ${from}. Reload to try again${archive}._`;
  }
  const tokens = formatCount(estimateTokens(bodyText(ctx.body)));
  if (ctx.body.type === "segments") {
    return `_Transcript loaded: ${ctx.body.segments.length} segments, about ${tokens} tokens${ctx.language ? ` (${ctx.language})` : ""}._`;
  }
  return `_${ctx.kind === "post" ? "Caption" : "Text"} loaded: ${ctx.body.paragraphs.length} paragraphs, about ${tokens} tokens._`;
}

function overviewMarkdown(ctx: LinkContext): string {
  const parts: string[] = [];
  const image = safeImageUrl(ctx.thumbnail);
  if (image) parts.push(`![${ctx.kind === "post" ? "First image" : "Thumbnail"}](${image})`);
  parts.push(`## ${ctx.title}`);
  const line = [
    ctx.author,
    ctx.kind === "video" && ctx.video?.duration ? formatTimestamp(ctx.video.duration) : undefined,
    stat(ctx, "Views") ? `${stat(ctx, "Views")} views` : undefined,
    fact(ctx, "Reading time") ? `${fact(ctx, "Reading time")} read` : undefined,
    formatDate(ctx.publishedAt),
  ].filter(Boolean);
  if (line.length) parts.push(line.join(" · "));
  if (ctx.chapters?.length) {
    const link = (s: number) => timestampUrl(ctx, s);
    parts.push(
      [
        "### Chapters",
        ...ctx.chapters.map((c) => linkifyTimestamps(`- [${formatTimestamp(c.start_time)}] ${c.title}`, link)),
      ].join("\n"),
    );
  }
  if (ctx.archive) {
    parts.push(
      `_Read from the [Internet Archive's copy](${ctx.archive.viewUrl}) saved ${formatDate(ctx.archive.savedOn)}, not the live page._`,
    );
  }
  parts.push(bodySummary(ctx));
  if (!hasBody(ctx) && ctx.noteReason === "language") {
    parts.push(
      "To use the captions in the video's own language, set **Transcript Language** to `auto` in Chat About Link's preferences.",
    );
  }
  return parts.join("\n\n");
}

/** Show text as-is in Markdown, e.g. an error from yt-dlp. */
function codeBlock(text: string): string {
  const fence = "```";
  return `${fence}\n${text.split(fence).join("'''")}\n${fence}`;
}

function turnMarkdown(turn: Turn, ctx: LinkContext | undefined): string {
  const question = `> ${turn.question.replace(/\n/g, "\n> ")}`;
  let body: string;
  if (turn.status === "error") body = `**Couldn't answer.** ${turn.error ?? ""}`;
  else if (!turn.answer) body = `_${turn.progress ?? "Thinking…"}_`;
  else body = ctx?.kind === "video" ? linkifyTimestamps(turn.answer, (s) => timestampUrl(ctx, s)) : turn.answer;
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

function AboutMetadata({ ctx, textOnly }: { ctx: LinkContext; textOnly: boolean }) {
  const best = ctx.video ? qualityName(maxHeight(ctx.video)) : undefined;
  const skip = new Set(["Uploaded captions", "Automatic captions", "Transcript language", "Spoken language"]);
  return (
    <List.Item.Detail.Metadata>
      {ctx.author && (
        <List.Item.Detail.Metadata.Label
          title={ctx.kind === "video" ? "Channel" : "Author"}
          text={ctx.author}
          icon={ctx.authorVerified ? Icon.CheckCircle : Icon.Person}
        />
      )}
      <List.Item.Detail.Metadata.Label title="Site" text={ctx.site} />
      {ctx.publishedAt && (
        <List.Item.Detail.Metadata.Label
          title={ctx.kind === "video" ? "Uploaded" : "Published"}
          text={formatDate(ctx.publishedAt)}
        />
      )}
      {ctx.facts
        .filter((f) => f.label && !skip.has(f.label))
        .map((f) => (
          <List.Item.Detail.Metadata.Label key={f.label} title={f.label} text={f.value} />
        ))}
      {best && <List.Item.Detail.Metadata.Label title="Best Quality" text={best} />}
      {ctx.stats.length > 0 && <List.Item.Detail.Metadata.Separator />}
      {ctx.stats.map((s) => (
        <List.Item.Detail.Metadata.Label
          key={s.label}
          title={s.label}
          text={s.label === "Images" && textOnly ? `${s.value} (this engine reads text only)` : s.value}
        />
      ))}
      {ctx.tags?.length ? (
        <List.Item.Detail.Metadata.TagList title={ctx.kind === "post" ? "Hashtags" : "Tags"}>
          {ctx.tags.slice(0, 6).map((tag) => (
            <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
          ))}
        </List.Item.Detail.Metadata.TagList>
      ) : null}
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Link title="Link" text={hostOf(ctx.url)} target={ctx.url} />
    </List.Item.Detail.Metadata>
  );
}

/**
 * Ask anything about one link — a video, a post or a web page. Loads what it
 * can (details, statistics, and the transcript, caption or article text), then
 * answers with the chosen AI engine. The search bar is the question box;
 * answers stream into the detail pane, with clickable timestamps for videos.
 */
export function LinkChat({ url, initialQuestion }: { url: string; initialQuestion?: string }) {
  const prefs = useMemo(() => getPreferenceValues<Preferences.ChatLink>(), []);
  const settings = useMemo(() => engineSettings(prefs), [prefs]);
  const expectedKind = useMemo(() => {
    const kind = linkKindOf(url);
    return kind === "spotify" ? "page" : kind;
  }, [url]);
  const [refresh, setRefresh] = useState(0);
  const [ctx, setCtx] = useState<LinkContext>();
  const [loadError, setLoadError] = useState<LoadError>();
  // Reading the Internet Archive's saved copy instead of the live page.
  const [archived, setArchived] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [searchText, setSearchText] = useState("");
  const [engine, setEngine] = useState<EnginePreference>((prefs.aiEngine as EnginePreference) || "auto");
  const { status: engineStatus, statuses: engineStatuses, recheck: recheckEngines } = useEngineStatus(engine, settings);
  const [selectedId, setSelectedId] = useState<string>();
  const [seesImages, setSeesImages] = useState<boolean>();
  // Ask Each Time asks once per chat.
  const imageChoice = useRef<"allow" | "text">(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const loadAbort = useRef<AbortController | null>(null);
  // Set when a new answer completes, so the effect below saves the chat once.
  const unsaved = useRef(false);
  const pendingText = useRef(new Map<string, string>());
  const flushTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const kind = ctx?.kind ?? expectedKind;
  const words = WORDS[kind];

  const missingTool = useMemo(() => {
    const tools = TOOL_PATHS[expectedKind];
    return Object.keys(tools).find((name) => !fs.existsSync(tools[name]()));
  }, [refresh, expectedKind]);

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
      title: ctx.title,
      kind: ctx.kind,
      channel: ctx.author,
      thumbnail: ctx.thumbnail,
      updatedAt: Date.now(),
      turns: done.map(({ question, answer }) => ({ question, answer })),
    });
  }, [turns, ctx]);

  async function load(force = false, fromArchive = archived) {
    loadAbort.current?.abort();
    const controller = new AbortController();
    loadAbort.current = controller;
    setLoadError(undefined);
    try {
      const context = await loadLinkContext(url, {
        signal: controller.signal,
        language: prefs.transcriptLanguage,
        force,
        archived: fromArchive,
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
      if (!controller.signal.aborted) {
        setLoadError({
          message: error instanceof Error ? error.message : String(error),
          fix: error instanceof LinkLoadError ? error.fix : undefined,
        });
      }
      return undefined;
    }
  }

  // Whether the chosen engine can look at a post's images, for the About item.
  useEffect(() => {
    if (!ctx?.images?.length) return;
    let cancelled = false;
    resolveEngine(engine, settings)
      .then((e) => e.seesImages())
      .then((sees) => !cancelled && setSeesImages(sees))
      .catch(() => !cancelled && setSeesImages(false));
    return () => {
      cancelled = true;
    };
  }, [engine, ctx?.images?.length]);

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

  async function ask(raw: string, context: LinkContext | undefined = ctx) {
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
    let imageDir: string | undefined;
    try {
      const chosen = await resolveEngine(engine, settings);
      chosenId = chosen.id;
      update(id, { engineTitle: chosen.title });
      let images: string[] | undefined;
      const count = context.images?.length ?? 0;
      if (count > 0) {
        const decision = imageDecision(prefs.chatImages, await chosen.seesImages(), count);
        if (decision === "ask" && !imageChoice.current) {
          const allow = await confirmAlert({
            title: imageQuestion(count),
            message:
              "It's slower. Your answer is kept for this chat; set the default with Look at Images in Chat About Link's preferences.",
            icon: Icon.Image,
            primaryAction: { title: "Allow" },
            dismissAction: { title: "Text Only" },
          });
          imageChoice.current = allow ? "allow" : "text";
        }
        if (decision === "use" || (decision === "ask" && imageChoice.current === "allow")) {
          update(id, { progress: "Fetching the images…" });
          imageDir = path.join(environment.supportPath, "chat-images", id);
          images = await fetchImages(context.images ?? [], imageDir, { signal: controller.signal });
          update(id, { progress: undefined });
        }
      }
      const answer = await answerQuestion(chosen, context, question, history, {
        signal: controller.signal,
        onData: (text) => streamText(id, text),
        onStatus: (status) => update(id, { progress: status }),
        images,
        answer: { style: prefs.answerStyle, language: prefs.answerLanguage, custom: prefs.customInstructions },
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
      if (imageDir) fs.rmSync(imageDir, { recursive: true, force: true });
    }
  }

  /** Switch between the live page and the Internet Archive's copy. */
  function readFromArchive(on: boolean) {
    setArchived(on);
    setCtx(undefined);
    void load(false, on);
  }

  async function clearChat() {
    if (!ctx) return;
    const confirmed = await confirmAlert({
      title: "Clear this chat?",
      message: `The saved questions and answers for this ${WORDS[ctx.kind].noun} are removed.`,
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
              onAction={() => saveFile(`${ctx.title} - Chat`, conversationMarkdown(ctx, done, engineTitle), "md")}
            />
          </>
        )}
        <Action.CopyToClipboard title="Copy Context for Any AI" icon={Icon.Clipboard} content={contextForExport(ctx)} />
        {hasBody(ctx) && (
          <Action
            title={ctx.kind === "video" ? "Save Transcript with Timestamps" : "Save Text"}
            icon={Icon.Document}
            onAction={() => {
              const file = bodyForSave(ctx);
              void saveFile(file.name, file.content, "txt");
            }}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.OpenInBrowser title="Open Link" url={ctx.url} shortcut={Keyboard.Shortcut.Common.Open} />
        <Action
          title={WORDS[ctx.kind].download}
          icon={Icon.Download}
          onAction={() => launchCommand({ name: "index", type: LaunchType.UserInitiated, context: { url } })}
        />
        <Action
          title="Reload"
          icon={Icon.ArrowClockwise}
          onAction={() => {
            setCtx(undefined);
            void load(true);
          }}
        />
        {ctx.kind === "page" && !ctx.archive && (
          <Action title="Read Archived Copy" icon={Icon.Clock} onAction={() => readFromArchive(true)} />
        )}
        {ctx.archive && (
          <>
            <Action title="Read Live Page" icon={Icon.Globe} onAction={() => readFromArchive(false)} />
            <Action.OpenInBrowser title="Open Archived Copy" url={ctx.archive.viewUrl} />
          </>
        )}
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

  const engineNoticeShown = !!engineStatus && !engineStatus.ready;
  const loadErrorTitle = `Couldn't load this ${words.noun}`;
  const loadErrorActions = loadError ? (
    <ActionPanel>
      {loadError.fix === "archive" && !archived && (
        <Action title="Read Archived Copy" icon={Icon.Clock} onAction={() => readFromArchive(true)} />
      )}
      <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={() => load(true)} />
      {archived && <Action title="Read Live Page" icon={Icon.Globe} onAction={() => readFromArchive(false)} />}
      {loadError.fix === "preferences" && (
        <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      )}
      <Action.CopyToClipboard title="Copy Error" content={loadError.message} />
      <Action.OpenInBrowser title="Open Link" url={url} />
    </ActionPanel>
  ) : null;

  return (
    <List
      isLoading={(!ctx && !loadError) || busy}
      isShowingDetail={!!ctx || engineNoticeShown}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={(text) => {
        if (text.trim() && !searchText.trim()) setSelectedId("typed");
        setSearchText(text);
      }}
      searchBarPlaceholder={
        ctx ? `Ask anything about this ${words.noun}…` : loadError ? loadErrorTitle : `${words.loading}…`
      }
      navigationTitle={ctx?.title ?? "Chat About Link"}
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
          engine notice is up, the link's loading or error state is an item too. */}
      {engineNoticeShown && !ctx && (
        <List.Section title="Link">
          {loadError ? (
            <List.Item
              id="load-error"
              title={loadErrorTitle}
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
              detail={<List.Item.Detail markdown={`## ${loadErrorTitle}\n\n${codeBlock(loadError.message)}`} />}
              actions={loadErrorActions}
            />
          ) : (
            <List.Item
              id="loading"
              title={`${words.loading}…`}
              subtitle={hostOf(url)}
              icon={Icon.Download}
              detail={<List.Item.Detail markdown={`${words.loading} from ${hostOf(url)}…`} />}
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
            title={loadErrorTitle}
            description={loadError.message}
            actions={loadErrorActions}
          />
        ) : !ctx ? (
          <List.EmptyView icon={Icon.Download} title={`${words.loading}…`} description={hostOf(url)} />
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
          {SUGGESTIONS[ctx.kind].map((s) => (
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
        <List.Section title={words.noun.charAt(0).toUpperCase() + words.noun.slice(1)}>
          <List.Item
            id="about"
            title={words.about}
            icon={Icon.Info}
            detail={
              <List.Item.Detail
                markdown={overviewMarkdown(ctx)}
                metadata={<AboutMetadata ctx={ctx} textOnly={seesImages === false} />}
              />
            }
            actions={
              <ActionPanel>
                {askTyped}
                <Action.OpenInBrowser title="Open Link" url={ctx.url} />
                {ctx.stats.length > 0 && (
                  <Action.CopyToClipboard
                    title="Copy Statistics"
                    content={[ctx.title, ...ctx.stats.map((s) => `${s.label}: ${s.value}`)].join("\n")}
                  />
                )}
                {!hasBody(ctx) && ctx.noteReason === "unreadable" && !ctx.archive && (
                  <Action title="Read Archived Copy" icon={Icon.Clock} onAction={() => readFromArchive(true)} />
                )}
                {!hasBody(ctx) && ctx.noteReason === "language" && (
                  <Action title="Open Chat Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
                )}
                {!hasBody(ctx) && ctx.noteReason === "blocked" && (
                  <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                )}
                {commonActions}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
