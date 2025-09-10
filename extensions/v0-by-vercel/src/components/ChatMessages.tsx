import { List, ActionPanel, Action, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { streamV0 } from "../lib/v0-stream";
import { v0ApiFetcher } from "../lib/v0-api-utils";
import type { ChatDetailResponse, VersionDetail, CreateMessageRequest } from "../types";
import ChatFilesDetail from "./ChatFilesDetail";
import type { CreateChatRequest } from "../types";

/**
 * ChatMessages Component
 *
 * Handles both creating new chats with streaming responses and viewing existing chats.
 * Features real-time streaming updates, follow-up message support, and smart revalidation
 * to ensure consistent state between streamed content and final server data.
 */

interface ChatMessagesProps {
  // One of request (create new chat) or chatId (open existing)
  request?: CreateChatRequest;
  chatId?: string;
  apiKey: string;
  scopeId?: string;
  // Optional follow-up request to stream immediately for existing chats
  followUpRequest?: CreateMessageRequest;
}

export default function ChatMessages({ request, chatId, apiKey, scopeId, followUpRequest }: ChatMessagesProps) {
  // Core state management
  const [assistantContent, setAssistantContent] = useState("");
  const [finalChatId, setChatId] = useState<string | undefined>(undefined);
  const chatIdRef = useRef<string | undefined>(undefined);
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(chatId);
  // Start streaming immediately only for new chat creation; otherwise idle until follow-up starts
  const [isStreaming, setIsStreaming] = useState(!!request);
  const [allowAutoRevalidate, setAllowAutoRevalidate] = useState(!!chatId);
  const abortRef = useRef<(() => void) | null>(null);
  const hasTriggeredInitialFollowUpRef = useRef(false);

  // UI state
  const [searchText, setSearchText] = useState("");
  const currentStreamIdRef = useRef<string | undefined>(undefined);
  const [isInitializing, setIsInitializing] = useState(false);
  const [chatTitle, setChatTitle] = useState<string | undefined>(undefined);
  const [latestVersion, setLatestVersion] = useState<VersionDetail | undefined>(undefined);

  // Message handling utilities
  type MessageRow = { id: string; role: "user" | "assistant"; content: string; createdAt?: string };
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const nowIso = () => new Date().toISOString();
  const sortNewestFirst = (rows: MessageRow[]) =>
    [...rows].sort((a, b) => new Date(b.createdAt || nowIso()).getTime() - new Date(a.createdAt || nowIso()).getTime());

  /**
   * Cleans streaming markdown content by removing v0 platform artifacts
   * while preserving the essential content structure
   */
  const sanitizeMarkdown = (s: string) => {
    if (!s) return s;

    // Simple cleaning - just remove footnote artifacts, don't try to format
    let out = s;

    // Remove vercel_knowledge footnote fragments
    out = out.replace(/\[\^vercel_knowledge[^\]]*\]/gi, "");
    out = out.replace(/\[\^[^\]]*\]/g, "");
    out = out.replace(/\s+\[\^\s*$/g, "");
    out = out.replace(/\[\^[^[\]]*$/g, "");
    out = out.replace(/\^vercel_knowledge[_\w-]*\]?/gi, "");
    out = out.replace(/vercel_knowledge[_\w-]*/gi, "");
    out = out.replace(/\^+(?!\s)/g, "");
    out = out.replace(/^\s*\[\^[^\]]+\]:.*$/gm, "");

    // Remove v0 internal markers
    out = out.replace(/\[V0_FILE][^\n]*\n?/g, "");
    out = out.replace(/AssistantMessageContentPart/g, "");
    out = out.replace(/Codeblock/g, "");

    return out;
  };

  /**
   * Formats message content for full display, handling v0-specific markup
   * like thinking tags, code projects, and task status indicators
   */
  const formatFullMessageContent = (content: string) => {
    let formattedContent = content.replace(/<Thinking>/g, "🧠\n");
    formattedContent = formattedContent.replace(/<\/Thinking>/g, "\n\n");
    formattedContent = formattedContent.replace(/<CodeProject[^>]*>[\s\S]*?<\/CodeProject>/g, "");
    formattedContent = formattedContent.replace(/<Actions>[\s\S]*?<\/Actions>/g, "");
    formattedContent = formattedContent.replace(
      /<V0LaunchTasks>[\s\S]*?<V0Task[^>]*taskNameActive="([^"]*)"[^>]*?\/>[\s\S]*?<\/V0LaunchTasks>/g,
      "**v0 is working on:** $1\n",
    );
    formattedContent = formattedContent.replace(
      /<V0LaunchTasks>[\s\S]*?<V0Task[^>]*taskNameComplete="([^"]*)"[^>]*?\/>[\s\S]*?<\/V0LaunchTasks>/g,
      "**v0 has completed:** $1\n",
    );
    formattedContent = formattedContent.replace(/<V0LaunchTasks>[\s\S]*?<\/V0LaunchTasks>/g, "");
    return formattedContent.trim();
  };

  /**
   * Creates a short preview version of message content for list display
   */
  const formatPreviewContent = (content: string) => {
    const maxLength = 100;
    let previewContent = content.replace(/<Thinking>/g, "");
    previewContent = previewContent.replace(/<\/Thinking>/g, " ");
    previewContent = previewContent.replace(/<CodeProject[^>]*>[\s\S]*?<\/CodeProject>/g, "");
    previewContent = previewContent.replace(/<Actions>[\s\S]*?<\/Actions>/g, "");
    previewContent = previewContent.replace(
      /<V0LaunchTasks>[\s\S]*?<V0Task[^>]*taskNameActive="([^"]*)"[^>]*?\/>[\s\S]*?<\/V0LaunchTasks>/g,
      "**v0 is working on:** $1 ",
    );
    previewContent = previewContent.replace(
      /<V0LaunchTasks>[\s\S]*?<V0Task[^>]*taskNameComplete="([^"]*)"[^>]*?\/>[\s\S]*?<\/V0LaunchTasks>/g,
      "**v0 has completed:** $1 ",
    );
    previewContent = previewContent.replace(/<V0LaunchTasks>[\s\S]*?<\/V0LaunchTasks>/g, "");
    previewContent = previewContent.replace(/\n/g, " ");
    previewContent = sanitizeMarkdown(previewContent);
    if (previewContent.length <= maxLength) {
      return previewContent.trim();
    }
    return `${previewContent.substring(0, maxLength).trim()}...`;
  };

  /**
   * NEW CHAT CREATION WITH STREAMING
   *
   * Handles the initial chat creation flow with real-time streaming updates.
   * Sets up optimistic UI with placeholder messages and streams the response.
   */
  useEffect(() => {
    if (!request) return;
    setAssistantContent("");
    setIsStreaming(true);
    // Seed UI immediately: user message and an assistant placeholder at the top
    const initialStreamId = `assistant-stream-${Date.now()}`;
    currentStreamIdRef.current = initialStreamId;
    setMessages([
      { id: initialStreamId, role: "assistant", content: "", createdAt: nowIso() },
      { id: "user-initial", role: "user", content: request.message, createdAt: nowIso() },
    ]);
    const abort = streamV0({
      url: "https://api.v0.dev/v1/chats",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "x-scope": scopeId || "",
      },
      body: { ...request, responseMode: "experimental_stream" },
      onDelta: (text) => {
        const streamId = currentStreamIdRef.current;
        if (!streamId) return;

        // Accumulate streaming text and apply content sanitization
        setAssistantContent((prev) => {
          const updated = prev + text;
          const sanitized = sanitizeMarkdown(updated);

          // Debug logging

          return sanitized;
        });
        setMessages((prev) => {
          const idx = prev.findIndex((r) => r.id === streamId);
          if (idx === -1) {
            return [
              {
                id: streamId || `assistant-stream-${Date.now()}`,
                role: "assistant",
                content: sanitizeMarkdown(text),
                createdAt: nowIso(),
              },
              ...prev,
            ];
          }
          const updated = [...prev];
          const currentContent = updated[idx].content || "";
          const newContent = currentContent + text;
          updated[idx] = {
            ...updated[idx],
            content: sanitizeMarkdown(newContent),
          };
          return updated;
        });
      },
      onChatUpdate: (chat) => {
        // Handle chat metadata and message updates during streaming
        if (chat?.id) {
          chatIdRef.current = chat.id;
          setChatId(chat.id);
          setCurrentChatId(chat.id); // Update the reactive chat ID
        }
        // capture title/name only in create-flow (no chatId yet)
        if (!chatId) {
          const title =
            (chat as { name?: string; title?: string } | undefined)?.name ||
            (chat as { name?: string; title?: string } | undefined)?.title;
          if (typeof title === "string" && title.trim().length > 0) {
            setChatTitle(title);
          }
        }
        if (chat?.messages && Array.isArray(chat.messages)) {
          type M = { id?: string; role: "user" | "assistant"; content?: string; createdAt?: string };
          const rows = (chat.messages as M[]).map((m: M) => ({
            id: m.id || Math.random().toString(),
            role: m.role,
            content: sanitizeMarkdown(m.content || ""),
            createdAt: m.createdAt || nowIso(),
          }));
          const sorted = sortNewestFirst(rows);
          setMessages((prev) => {
            let newRows = sorted;
            if (isStreaming) {
              // Drop empty assistant rows during streaming
              newRows = newRows.filter(
                (r) => !(r.role === "assistant" && (!r.content || r.content.trim().length === 0)),
              );
              // Deduplicate the initial user message we already seeded
              const prevUsers = prev.filter((r) => r.role === "user");
              const existingUserContents = new Set(prevUsers.map((r) => r.content.trim()));
              newRows = newRows.filter((r) => !(r.role === "user" && existingUserContents.has(r.content.trim())));
              // If we have a streaming placeholder, keep it and merge content if available
              const hasPlaceholder = prev.find((r) => r.id === currentStreamIdRef.current);
              if (hasPlaceholder) {
                const firstAssistantIdx = newRows.findIndex((r) => r.role === "assistant");
                if (
                  firstAssistantIdx >= 0 &&
                  newRows[firstAssistantIdx].content &&
                  newRows[firstAssistantIdx].content.trim().length > 0
                ) {
                  const merged = { ...hasPlaceholder, content: newRows[firstAssistantIdx].content };
                  newRows.splice(firstAssistantIdx, 1);
                  return [merged, ...prevUsers, ...newRows];
                }
                return [hasPlaceholder, ...prevUsers, ...newRows];
              }
            }
            // Not streaming: show newest-first from snapshot
            return newRows;
          });
          // Capture latestVersion when available during streaming updates (create flow)
          const v = (chat as unknown as { latestVersion?: VersionDetail })?.latestVersion;
          if (v) setLatestVersion(v);
        }
      },
      onDone: async () => {
        setIsStreaming(false);
        abortRef.current = null;

        // Enable auto-revalidation for future follow-ups
        setAllowAutoRevalidate(true);

        // Fetch final canonical content to ensure consistency with server state
        try {
          const resolvedId = chatIdRef.current || finalChatId;
          if (resolvedId) {
            const detail = await v0ApiFetcher<ChatDetailResponse>(`https://api.v0.dev/v1/chats/${resolvedId}`, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "x-scope": scopeId || "",
              },
            });
            if (detail?.text && typeof detail.text === "string") {
              setAssistantContent(sanitizeMarkdown(detail.text));
              setMessages((prev) => {
                const cloned = [...prev];
                if (cloned.length > 0 && cloned[0].role === "assistant") {
                  cloned[0] = { ...cloned[0], content: sanitizeMarkdown(detail.text || "") };
                }
                return cloned;
              });
            }
            if (detail?.latestVersion) setLatestVersion(detail.latestVersion);
          }
        } catch {
          // Ignore fetch errors - we already have streamed content as fallback
        }
      },
      onError: () => {
        setIsStreaming(false);
        abortRef.current = null;
      },
      debug: true,
    });
    abortRef.current = abort;
    return () => {
      if (abortRef.current) {
        abortRef.current();
        abortRef.current = null;
      }
    };
  }, [request, apiKey, scopeId]);

  /**
   * EXISTING CHAT LOADING & SMART REVALIDATION
   *
   * Uses cached promise to fetch existing chat data and handles revalidation
   * after follow-up messages to sync streamed content with server state.
   */
  const { revalidate: revalidateChat } = useCachedPromise(
    async (id: string, token: string, scope: string) => {
      if (!id) {
        return null;
      }
      const detail = await v0ApiFetcher<ChatDetailResponse>(`https://api.v0.dev/v1/chats/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-scope": scope || "",
        },
      });
      return detail;
    },
    [currentChatId || "", apiKey, scopeId || ""],
    {
      execute: (() => {
        const shouldExecute = !!currentChatId && !!apiKey && allowAutoRevalidate;
        return shouldExecute;
      })(),
      keepPreviousData: true,
      onWillExecute: () => {
        if (currentChatId) {
          setIsStreaming(false);
          // Show loading state only for initial existing chat loads
          if (chatId && messages.length === 0) {
            setIsInitializing(true);
          }
        }
      },
      onData: (detail) => {
        if (!detail?.messages) {
          setIsInitializing(false);
          return;
        }

        const d = detail as unknown as { name?: string; title?: string };
        if (d?.name || d?.title) {
          setChatTitle((d.name || d.title) as string);
        }
        if (detail?.latestVersion) setLatestVersion(detail.latestVersion);
        type M = { id: string; role: "user" | "assistant"; content: string; createdAt: string };
        const rows = (detail.messages as M[]).map((m) => ({
          id: m.id,
          role: m.role,
          content: sanitizeMarkdown(m.content || ""),
          createdAt: m.createdAt || nowIso(),
        }));

        setMessages((prev) => {
          // Strategy: preserve streaming state while merging server data
          if (!isStreaming) {
            return sortNewestFirst(rows);
          }
          // During streaming: preserve placeholder, merge only user messages
          const users = rows.filter((r) => r.role === "user");
          const existingUserContents = new Set(prev.filter((r) => r.role === "user").map((r) => r.content.trim()));
          const merged = [...prev];
          users.filter((u) => !existingUserContents.has(u.content.trim())).forEach((u) => merged.push(u));
          return sortNewestFirst(merged);
        });
        setIsInitializing(false);
      },
    },
  );

  const preview = assistantContent
    ? formatPreviewContent(assistantContent)
    : isStreaming
      ? "🧠 v0 is thinking…"
      : "Ready";

  const getCurrentChatId = () => chatIdRef.current || finalChatId || chatId || "";

  /**
   * FOLLOW-UP MESSAGE HANDLING
   *
   * Manages sending additional messages to existing chats with optimistic UI
   * updates and proper streaming integration.
   */
  const sendFollowUpRequest = (req: CreateMessageRequest) => {
    const text = (req.message || "").trim();
    const attachments = req.attachments;
    const modelConfiguration = req.modelConfiguration;
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const cid = chatIdRef.current || finalChatId || chatId;
    if (!cid) return;

    // Create optimistic UI with user message and assistant placeholder
    const followupStreamId = `assistant-stream-${Date.now()}`;
    currentStreamIdRef.current = followupStreamId;
    setMessages((prev) => [
      { id: followupStreamId, role: "assistant", content: "", createdAt: nowIso() },
      { id: `user-${Date.now()}`, role: "user", content: trimmed, createdAt: nowIso() },
      ...prev,
    ]);
    setAssistantContent("");
    setIsStreaming(true);
    setTimeout(() => setSearchText(""), 0);

    const abort = streamV0({
      url: `https://api.v0.dev/v1/chats/${cid}/messages`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "x-scope": scopeId || "",
      },
      body: {
        message: trimmed,
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
        ...(modelConfiguration ? { modelConfiguration } : {}),
        responseMode: "experimental_stream",
      },
      onDelta: (delta) => {
        const streamId = currentStreamIdRef.current;
        if (!streamId) return;

        // Accumulate and sanitize follow-up response
        setAssistantContent((prev) => {
          const updated = prev + delta;
          const sanitized = sanitizeMarkdown(updated);
          return sanitized;
        });
        setMessages((prev) => {
          const idx = prev.findIndex((r) => r.id === streamId);
          if (idx === -1) {
            return [
              {
                id: streamId || `assistant-stream-${Date.now()}`,
                role: "assistant",
                content: sanitizeMarkdown(delta),
                createdAt: nowIso(),
              },
              ...prev,
            ];
          }
          const updated = [...prev];
          const currentContent = updated[idx].content || "";
          const newContent = currentContent + delta;
          updated[idx] = {
            ...updated[idx],
            content: sanitizeMarkdown(newContent),
          };
          return updated;
        });
      },
      onDone: async () => {
        setIsStreaming(false);
        abortRef.current = null;

        try {
          // Trigger revalidation to sync with server state
          setAllowAutoRevalidate(true);
          await revalidateChat();
        } catch {
          // Ignore revalidation errors
        }
      },
      onError: async (err) => {
        setIsStreaming(false);
        abortRef.current = null;
        try {
          await showToast({
            style: Toast.Style.Failure,
            title: "Stream error",
            message: err?.message || "Unknown error",
          });
        } catch {
          void 0;
        }
      },
      debug: true,
    });
    abortRef.current = abort;
  };

  // Backwards compatibility helper: keep existing string-based callsites
  const sendFollowUp = (text: string) => sendFollowUpRequest({ message: text });

  // If a follow-up request was provided, trigger it once on mount/update
  useEffect(() => {
    if (!followUpRequest) return;
    if (hasTriggeredInitialFollowUpRef.current) return;
    if (!chatId) return; // needs an existing chat id
    hasTriggeredInitialFollowUpRef.current = true;

    // Strategy: First fetch current messages for the existing chat, then start the follow-up stream
    const run = async () => {
      try {
        // Temporarily pause auto revalidation to avoid competing fetches
        setAllowAutoRevalidate(false);
        setIsInitializing(true);
        const detail = await v0ApiFetcher<ChatDetailResponse>(`https://api.v0.dev/v1/chats/${chatId}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "x-scope": scopeId || "",
          },
        });
        if (detail) {
          const d = detail as unknown as { name?: string; title?: string };
          if (d?.name || d?.title) {
            setChatTitle((d.name || d.title) as string);
          }
          if (detail?.latestVersion) setLatestVersion(detail.latestVersion);
          type M = { id: string; role: "user" | "assistant"; content: string; createdAt: string };
          const rows = (detail.messages as M[]).map((m) => ({
            id: m.id,
            role: m.role,
            content: sanitizeMarkdown(m.content || ""),
            createdAt: m.createdAt || nowIso(),
          }));
          setMessages(sortNewestFirst(rows));
        }
      } catch {
        // ignore snapshot fetch errors; follow-up stream will still proceed
      } finally {
        setIsInitializing(false);
        // Start follow-up streaming after snapshot
        sendFollowUpRequest(followUpRequest);
      }
    };
    run();
  }, [followUpRequest, chatId, apiKey, scopeId]);

  const renderActions = () => (
    <ActionPanel>
      <Action
        title="Ask"
        icon={Icon.ArrowRight}
        shortcut={{ modifiers: ["opt"], key: "enter" }}
        onAction={() => sendFollowUp(searchText)}
      />
      <Action.OpenInBrowser
        icon={Icon.Globe}
        title="View Chat in Browser"
        shortcut={Keyboard.Shortcut.Common.Open}
        url={`https://v0.dev/chat/${getCurrentChatId()}`}
      />
      {latestVersion?.files && latestVersion.files.length > 0 && (
        <Action.Push
          title="View Latest Files"
          icon={Icon.Document}
          target={<ChatFilesDetail files={latestVersion.files} />}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
        />
      )}
      {latestVersion?.demoUrl && (
        <Action.OpenInBrowser
          title="View Demo"
          icon={Icon.Play}
          url={latestVersion.demoUrl}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
        />
      )}
    </ActionPanel>
  );

  /**
   * RENDERING LOGIC
   */
  // Show loading state for existing chat initialization
  if (isInitializing) {
    return (
      <List navigationTitle={chatTitle || "Getting Chat…"}>
        <List.EmptyView title="Getting chat…" description="Fetching messages from v0" />
      </List>
    );
  }

  return (
    <List
      key={`chat-${currentChatId || "new"}`}
      isShowingDetail
      navigationTitle={chatTitle || "New Chat"}
      searchBarPlaceholder="Ask another question…"
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
    >
      {messages.length === 0 ? (
        <List.Item
          title={preview}
          detail={
            <List.Item.Detail
              markdown={assistantContent ? formatFullMessageContent(assistantContent) : "🧠 v0 is thinking…_"}
            />
          }
          actions={renderActions()}
        />
      ) : (
        messages.map((m, idx) => (
          <List.Item
            key={m.id || `${m.role}-${idx}`}
            title={formatPreviewContent(m.content) || (m.role === "user" ? "You" : "🧠 v0 is thinking…")}
            detail={<List.Item.Detail markdown={formatFullMessageContent(m.content) || "_…_"} />}
            actions={renderActions()}
          />
        ))
      )}
    </List>
  );
}
