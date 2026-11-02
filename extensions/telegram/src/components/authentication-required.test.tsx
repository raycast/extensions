import { createElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BrowseChats from "../browse-chats";
import SendMessage from "../send-message";
import { ChatMessagesView } from "./chat-messages-view";
import { SavedMessagesView } from "./saved-messages-view";
import { Chat } from "../services/telegram-client";
import { TelegramAuthenticationError } from "../utils/errors";

const mocks = vi.hoisted(() => ({
  request: { data: [] as unknown[], error: undefined as unknown, isLoading: false, revalidate: vi.fn() },
  actions: [] as { title: string; onAction?: () => Promise<void> }[],
  launchCommand: vi.fn(),
}));

// Raycast supplies native UI components at runtime. Render their content and
// retain action handlers while exercising the real views and React hooks.
vi.mock("@raycast/api", async () => {
  const { createElement } = await import("react");
  type Props = { children?: ReactNode; actions?: ReactNode; title?: string; markdown?: string };
  const container = ({ children, actions, title, markdown }: Props) =>
    createElement("div", null, title, markdown, children, actions);
  const action = (props: (typeof mocks.actions)[number]) => {
    mocks.actions.push(props);
    return createElement("button", null, props.title);
  };
  const dropdown = Object.assign(container, { Item: container, Section: container });
  return {
    List: Object.assign(container, { EmptyView: container, Section: container }),
    Detail: container,
    Form: Object.assign(container, { Dropdown: dropdown, TextArea: container, FilePicker: container }),
    ActionPanel: container,
    Action: Object.assign(action, { SubmitForm: action }),
    Icon: { Key: "key", Message: "message", ArrowRight: "arrow", Person: "person", TwoPeople: "people" },
    LaunchType: { UserInitiated: "user-initiated" },
    launchCommand: mocks.launchCommand,
    LocalStorage: { getItem: vi.fn(), setItem: vi.fn() },
    showToast: vi.fn(),
    Toast: { Style: { Failure: "failure", Success: "success" } },
    getPreferenceValues: vi.fn(),
    popToRoot: vi.fn(),
  };
});

// Supply the settled request state at the hook boundary, including stale cache
// data, so removing a view's authentication-error branch breaks these tests.
vi.mock("@raycast/utils", () => ({ useCachedPromise: () => mocks.request }));
vi.mock("../services/telegram-client", () => ({
  getChats: vi.fn(),
  getChatMessages: vi.fn(),
  getSavedMessages: vi.fn(),
  isAuthenticated: vi.fn(),
  authenticate: vi.fn(),
}));
vi.mock("../hooks/use-send-message", () => ({
  useSendMessage: () => ({ handleSubmit: vi.fn(), itemProps: {}, isSubmitting: false }),
}));
vi.mock("./chat-list-item", () => ({
  ChatListItem: ({ chat }: { chat: Chat }) => createElement("span", null, chat.title),
}));
vi.mock("./chat-message-list-item", () => ({
  ChatMessageListItem: ({ message }: { message: { text: string } }) => createElement("span", null, message.text),
}));
vi.mock("./saved-message-list-item", () => ({
  SavedMessageListItem: ({ message }: { message: { text: string } }) => createElement("span", null, message.text),
}));

const chat: Chat = { id: "test-chat", title: "Test Chat", type: "private", unreadCount: 0, isPinned: false };
const cachedChat: Chat = { ...chat, title: "Cached Chat" };
const cachedMessage = { id: 1, text: "Cached Message", date: new Date() };

describe.each([
  { name: "Browse Chats", view: () => createElement(BrowseChats), data: [cachedChat], normalContent: "Cached Chat" },
  {
    name: "Chat Messages",
    view: () => createElement(ChatMessagesView, { chat }),
    data: [cachedMessage],
    normalContent: "Cached Message",
  },
  {
    name: "Saved Messages",
    view: () => createElement(SavedMessagesView),
    data: [cachedMessage],
    normalContent: "Cached Message",
  },
  { name: "Send Message", view: () => createElement(SendMessage), data: [cachedChat], normalContent: "Send Message" },
])("$name session recovery view", ({ view, data, normalContent }) => {
  beforeEach(() => {
    mocks.request.data = data;
    mocks.request.error = undefined;
    mocks.actions.length = 0;
    mocks.launchCommand.mockReset();
  });

  it.each([
    { name: "cleared session", error: new TelegramAuthenticationError() },
    { name: "rejected authorization key", error: { errorMessage: "AUTH_KEY_UNREGISTERED" } },
  ])("offers working authentication after a $name", async ({ error }) => {
    mocks.request.error = error;

    const rendered = renderToStaticMarkup(view());

    expect(rendered).toContain("Sign In to Telegram");
    expect(rendered).toContain("Authenticate with Telegram");
    expect(rendered).not.toContain(normalContent);
    expect(mocks.actions).toHaveLength(1);
    expect(mocks.actions[0].onAction).toEqual(expect.any(Function));
    await mocks.actions[0].onAction!();
    expect(mocks.launchCommand).toHaveBeenCalledExactlyOnceWith({ name: "authenticate", type: "user-initiated" });
  });

  it("keeps normal content after a network error", () => {
    mocks.request.error = new Error("Connection timed out");

    const rendered = renderToStaticMarkup(view());

    expect(rendered).toContain(normalContent);
    expect(rendered).not.toContain("Sign In to Telegram");
    expect(mocks.actions.some((action) => action.title === "Authenticate with Telegram")).toBe(false);
    expect(mocks.launchCommand).not.toHaveBeenCalled();
  });
});
