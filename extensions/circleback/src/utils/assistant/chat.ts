import { Chat } from "@ai-sdk/react";
import { captureException } from "@raycast/api";
import { getAccessToken, showFailureToast } from "@raycast/utils";
import { DefaultChatTransport, UIMessage } from "ai";
import * as z from "zod";
import { EMAIL_DRAFT_NOTICE, MEETING_ACCESS_NOTICE, MEETING_HISTORY_NOTICES } from "../../constants/assistant";
import { APP_URL } from "../../constants/raycast";
import { fetchJson } from "../api";

type AssistantMessage = UIMessage<{ timestamp: number; persistedMessageId?: number }>;

const ActionSchema = z.object({
  toolName: z.string(),
  input: z
    .object({
      searchTerms: z.array(z.string()).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    })
    .optional(),
  isFailed: z.boolean().optional(),
  actionGroupDurationMs: z.number().optional(),
});
const SourcesSchema = z.array(
  z.object({
    sourceId: z.string(),
    name: z.string(),
    meetingId: z.string().optional(),
  }),
);
const RestrictionSchema = z.object({ canUpgrade: z.boolean() });
const EmailDraftSchema = z.object({ to: z.array(z.string()), subject: z.string(), body: z.string().optional() });

type Source = z.infer<typeof SourcesSchema>[number];

const transport = new DefaultChatTransport<AssistantMessage>({
  api: new URL("/api/assistant", APP_URL).toString(),
  headers: () => ({ Authorization: `Bearer ${getAccessToken().token}` }),
  prepareSendMessagesRequest: ({ id, messages }) => ({
    body: {
      chatId: id,
      messages,
      context: [],
      userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  }),
});

// Kept outside React, like assistantSessionStore, so answers keep streaming
// while another chat is selected.
const chatsById = new Map<string, Chat<AssistantMessage>>();
const sourcesByChatId = new Map<string, Source[]>();

export const getAssistantChat = (chatId: string) => {
  const existingChat = chatsById.get(chatId);
  if (existingChat) return existingChat;
  const chat = new Chat<AssistantMessage>({
    id: chatId,
    transport,
    onData: ({ type, data }) => {
      if (type !== "data-assistant-sources") return;
      sourcesByChatId.set(chatId, [...getChatSources(chatId), ...(SourcesSchema.safeParse(data).data ?? [])]);
    },
    onError: (error) => {
      captureException(error);
      showFailureToast(error, { title: "Could not get an answer." });
    },
  });
  chatsById.set(chatId, chat);
  return chat;
};

export const getChatSources = (chatId: string) => sourcesByChatId.get(chatId) ?? [];

export const askAssistant = (chat: Chat<AssistantMessage>, question: string) =>
  chat.sendMessage({ text: question, metadata: { timestamp: Date.now() } });

const getText = ({ parts }: AssistantMessage) =>
  parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n\n");

const getActions = ({ parts }: AssistantMessage) =>
  parts.flatMap((part) => {
    if (part.type !== "data-assistant-action") return [];
    const result = ActionSchema.safeParse(part.data);
    return result.success ? [result.data] : [];
  });

const getEmailDrafts = ({ parts }: AssistantMessage) =>
  parts.flatMap((part) => {
    if (part.type !== "data-assistant-email-draft") return [];
    const result = EmailDraftSchema.safeParse(part.data);
    return result.success ? [result.data] : [];
  });

// The answer stops at these parts, so without a notice it would look empty.
const getNotices = ({ parts }: AssistantMessage) => [
  ...new Set(
    parts.flatMap((part) => {
      if (part.type === "data-assistant-meeting-access") return [MEETING_ACCESS_NOTICE];
      if (part.type === "data-assistant-email-draft") return [EMAIL_DRAFT_NOTICE];
      if (part.type !== "data-assistant-meeting-history-restriction") return [];
      const result = RestrictionSchema.safeParse(part.data);
      if (!result.success) return [];
      return [result.data.canUpgrade ? MEETING_HISTORY_NOTICES.canUpgrade : MEETING_HISTORY_NOTICES.cannotUpgrade];
    }),
  ),
];

export const getTurns = (messages: AssistantMessage[]) =>
  messages.flatMap((message, index) => {
    if (message.role !== "user") return [];
    const nextMessage = messages[index + 1];
    const answer = nextMessage?.role === "assistant" ? nextMessage : undefined;
    return [
      {
        id: message.id,
        question: getText(message),
        answer: answer ? getText(answer) : "",
        actions: answer ? getActions(answer) : [],
        emailDrafts: answer ? getEmailDrafts(answer) : [],
        notices: answer ? getNotices(answer) : [],
      },
    ];
  });

const ChatSummariesSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string().nullable(),
    updatedAt: z.coerce.date(),
  }),
);

export const fetchAssistantChats = async () =>
  ChatSummariesSchema.parse(await fetchJson<unknown>("/api/assistant/chats"));

// Saved parts keep their fields under data, so they're reshaped like streamed parts.
const SavedPartSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), data: z.object({ text: z.string() }) }).transform(({ type, data }) => ({
    type,
    text: data.text,
  })),
  z
    .object({
      type: z.literal("data-assistant-action"),
      id: z.string(),
      data: z.object({
        // Loose so fields like metadata.meetingNames, which follow-up requests need, are kept.
        action: z.looseObject({ toolName: z.string(), input: z.unknown() }),
        actionGroupDurationMs: z.number().optional(),
      }),
    })
    .transform(({ type, id, data: { action, actionGroupDurationMs } }) => ({
      type,
      id,
      data: { ...action, actionGroupDurationMs },
    })),
  z.object({
    type: z.enum([
      "data-assistant-meeting-history-restriction",
      "data-assistant-meeting-access",
      "data-assistant-email-draft",
    ]),
    id: z.string(),
    data: z.unknown(),
  }),
]);
const SavedChatSchema = z.object({
  messages: z.array(
    z.object({
      id: z.number(),
      role: z.enum(["User", "Assistant"]),
      createdAt: z.coerce.date(),
      parts: z.array(z.unknown()),
    }),
  ),
});

const fetchAssistantChatMessages = async (chatId: string): Promise<AssistantMessage[]> => {
  const { messages } = SavedChatSchema.parse(await fetchJson<unknown>(`/api/assistant/chats/${chatId}`));
  return messages.map(({ id, role, createdAt, parts }) => ({
    id: String(id),
    role: role === "User" ? "user" : "assistant",
    parts: parts.flatMap((part) => SavedPartSchema.safeParse(part).data ?? []),
    metadata: { timestamp: createdAt.getTime(), persistedMessageId: id },
  }));
};

const latestLoadsByChatId = new Map<string, Promise<AssistantMessage[]>>();

// Reloads on every selection, so a follow-up doesn't overwrite newer messages
// sent from Circleback. An answer still streaming here is kept, and an older
// load that finishes late is dropped so it can't undo a newer follow-up.
export const loadSavedMessages = async (chat: Chat<AssistantMessage>) => {
  if (chat.status === "submitted" || chat.status === "streaming") return;
  const load = fetchAssistantChatMessages(chat.id);
  latestLoadsByChatId.set(chat.id, load);
  const messages = await load;
  if (latestLoadsByChatId.get(chat.id) === load) chat.messages = messages;
};
