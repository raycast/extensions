import { useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  BrowserExtension,
  Clipboard,
  Color,
  Icon,
  Image,
  Keyboard,
  List,
  confirmAlert,
  getPreferenceValues,
} from "@raycast/api";
import { EnginePreference, engineSettings } from "../lib/ai-engines.js";
import { StoredChat, deleteChat, loadChats } from "../lib/chat-store.js";
import { LinkKind } from "../lib/link-context.js";
import { plural } from "../lib/format.js";
import { hostOf, safeImageUrl } from "../lib/kinds.js";
import { linkKindOf } from "../lib/link-loader.js";
import { isValidUrl } from "../utils.js";
import { EngineNotice, useEngineStatus } from "./engine-notice.js";
import { LinkChat } from "./link-chat.js";

type Candidate = { url: string; title: string; icon: Icon };

const SUMMARIZE = {
  video: "Summarize the video: a two-sentence overview, then the key points with timestamps.",
  text: "Summarize this: a two-sentence overview, then the key points.",
};

const KIND_ICONS: Record<LinkKind, Icon> = { video: Icon.Video, post: Icon.Image, page: Icon.Document };

function chatIcon(chat: StoredChat): Image.ImageLike {
  const kindIcon = KIND_ICONS[chat.kind ?? "video"];
  const thumb = safeImageUrl(chat.thumbnail);
  return thumb
    ? { source: thumb, mask: Image.Mask.RoundedRectangle, fallback: kindIcon }
    : { source: kindIcon, tintColor: Color.Purple };
}

function chatMarkdown(chat: StoredChat): string {
  const thumb = safeImageUrl(chat.thumbnail);
  const recent = chat.turns
    .slice(-3)
    .map(
      (t) =>
        `**${t.question.replace(/\n/g, " ")}**\n\n${t.answer.length > 400 ? `${t.answer.slice(0, 400)}…` : t.answer}`,
    );
  return [
    thumb ? `![Thumbnail](${thumb})` : "",
    `## ${chat.title}`,
    [chat.channel, hostOf(chat.url)].filter(Boolean).join(" · "),
    ...recent,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * The start screen of Chat About Link: paste a link (or take one from the
 * clipboard or the browser), or pick up a previous conversation.
 */
export function ChatHome({ initialText = "" }: { initialText?: string }) {
  const [searchText, setSearchText] = useState(initialText);
  const [chats, setChats] = useState<StoredChat[]>();
  const [found, setFound] = useState<Candidate[]>([]);
  const prefs = useMemo(() => getPreferenceValues<Preferences.ChatLink>(), []);
  const settings = useMemo(() => engineSettings(prefs), [prefs]);
  // Tell about an engine that isn't ready before a link is pasted, not after the first question.
  const engine = useEngineStatus((prefs.aiEngine as EnginePreference) || "auto", settings);

  useEffect(() => {
    refresh();
    (async () => {
      const candidates: Candidate[] = [];
      // Same opt-ins as the Download command.
      const { autoLoadUrlFromClipboard, enableBrowserExtensionSupport } = getPreferenceValues<ExtensionPreferences>();
      const copied = autoLoadUrlFromClipboard ? (await Clipboard.readText())?.trim() : undefined;
      if (copied && isValidUrl(copied)) candidates.push({ url: copied, title: "Copied Link", icon: Icon.Clipboard });
      if (enableBrowserExtensionSupport) {
        try {
          const tab = (await BrowserExtension.getTabs()).find((t) => t.active);
          if (tab?.url && isValidUrl(tab.url) && tab.url !== copied) {
            candidates.push({ url: tab.url, title: tab.title || "Current Browser Tab", icon: Icon.Globe });
          }
        } catch {
          /* no browser extension */
        }
      }
      setFound(candidates);
    })();
  }, []);

  const typed = searchText.trim();
  const typedUrl = isValidUrl(typed) ? typed : undefined;
  const starts = [
    ...(typedUrl ? [{ url: typedUrl, title: "Pasted Link", icon: Icon.Link }] : []),
    ...found.filter((c) => c.url !== typedUrl),
  ];
  const shown = useMemo(() => {
    if (!chats) return [];
    if (!typed || typedUrl) return chats;
    const q = typed.toLowerCase();
    return chats.filter((c) => `${c.title} ${c.channel ?? ""}`.toLowerCase().includes(q));
  }, [chats, typed, typedUrl]);

  // Coming back from a chat: it may be new, or have new answers.
  const refresh = () => void loadChats().then(setChats);

  async function remove(chat: StoredChat) {
    setChats(await deleteChat(chat.key));
  }

  async function removeAll() {
    const confirmed = await confirmAlert({
      title: "Delete all chats?",
      message: "Every saved conversation is removed. Downloads are not affected.",
      icon: Icon.Trash,
      primaryAction: { title: "Delete All", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    for (const chat of chats ?? []) await deleteChat(chat.key);
    setChats([]);
  }

  return (
    <List
      isLoading={chats === undefined}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Paste a link, or search your chats…"
      isShowingDetail={shown.length > 0 || starts.length > 0 || (!!engine.status && !engine.status.ready)}
    >
      <List.EmptyView
        icon={{ source: Icon.SpeechBubbleActive, tintColor: Color.Purple }}
        title={typed && !typedUrl ? "No matching chats" : "Paste a link to start"}
        description="A video (YouTube, TikTok, X…), a post (Instagram, Reddit…) or any article. Its details and text — the transcript, caption or article — are loaded for you to ask about."
      />
      {starts.length > 0 && (
        <List.Section title="Start a Chat">
          {starts.map((c) => (
            <List.Item
              key={c.url}
              id={`start-${c.url}`}
              title={c.title}
              subtitle={hostOf(c.url)}
              icon={{ source: c.icon, tintColor: Color.Purple }}
              detail={
                <List.Item.Detail
                  markdown={`## Chat about this link\n\n\`${c.url.replace(/`/g, "")}\`\n\nPress **↵** to load its details and text (a video's transcript, a post's caption or an article), then ask anything.`}
                />
              }
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Start Chat"
                    icon={Icon.SpeechBubbleActive}
                    target={<LinkChat url={c.url} />}
                    onPop={refresh}
                  />
                  <Action.Push
                    title="Summarize"
                    icon={Icon.Text}
                    target={
                      <LinkChat
                        url={c.url}
                        initialQuestion={SUMMARIZE[linkKindOf(c.url) === "video" ? "video" : "text"]}
                      />
                    }
                    onPop={refresh}
                  />
                  <Action.OpenInBrowser title="Open Link" url={c.url} shortcut={Keyboard.Shortcut.Common.Open} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {/* After Start a Chat, so ↵ on a pasted link starts the chat rather than a fix. */}
      <EngineNotice status={engine.status} statuses={engine.statuses} onRetry={engine.recheck} />
      {shown.length > 0 && (
        <List.Section title="Recent Chats" subtitle={String(shown.length)}>
          {shown.map((chat) => (
            <List.Item
              key={chat.key}
              id={chat.key}
              title={chat.title}
              icon={chatIcon(chat)}
              accessories={[
                { text: plural(chat.turns.length, "question"), icon: Icon.SpeechBubble },
                { date: new Date(chat.updatedAt), tooltip: "Last asked" },
              ]}
              detail={<List.Item.Detail markdown={chatMarkdown(chat)} />}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Continue Chat"
                    icon={Icon.SpeechBubbleActive}
                    target={<LinkChat url={chat.url} />}
                    onPop={refresh}
                  />
                  <Action.OpenInBrowser title="Open Link" url={chat.url} shortcut={Keyboard.Shortcut.Common.Open} />
                  <Action.CopyToClipboard
                    title="Copy Link"
                    content={chat.url}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                  <ActionPanel.Section>
                    <Action
                      title="Delete Chat"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => remove(chat)}
                    />
                    <Action
                      title="Delete All Chats"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.RemoveAll}
                      onAction={removeAll}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
