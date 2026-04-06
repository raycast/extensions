import type { FeedResponse } from "../types";
import { authenticate } from "./auth";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await authenticate();
  return {
    Cookie: `_sso.key=${session.ssoKey}`,
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };
}

// --- Feed ---

export async function getFeed(cursor?: string): Promise<FeedResponse> {
  const params = new URLSearchParams({
    filter_posts: "false",
    omit_channels: cursor ? "true" : "false",
    comment_post_score_mode: "off",
  });
  if (cursor) params.set("cursor", cursor);

  const headers = await getAuthHeaders();
  const res = await fetch(
    `https://bookface.ycombinator.com/feed-v2.json?${params}`,
    { headers },
  );

  if (!res.ok) throw new Error(`Bookface feed error: ${res.status}`);
  return res.json();
}

// --- Comments ---

export interface RawComment {
  id: number;
  body: string;
  parent_id: number | null;
  created_at: string;
  deleted: boolean;
  user: {
    id: number;
    full_name: string;
    avatar_thumb?: string;
    companies?: { name: string; batch: string }[];
  };
  vote_info?: { count: number };
}

export interface Comment extends RawComment {
  replies: Comment[];
}

function buildCommentTree(flat: RawComment[]): Comment[] {
  const map = new Map<number, Comment>();
  const roots: Comment[] = [];

  for (const c of flat) {
    map.set(c.id, { ...c, replies: [] });
  }

  for (const c of flat) {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function getPostComments(postId: number): Promise<Comment[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `https://bookface.ycombinator.com/posts/${postId}/comments`,
    { headers },
  );

  if (!res.ok) throw new Error(`Comments error: ${res.status}`);
  const flat: RawComment[] = await res.json();
  return buildCommentTree(flat.filter((c) => !c.deleted));
}

// --- Votes ---

export async function upvotePost(
  postId: number,
): Promise<{ id: number; direction: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `https://bookface.ycombinator.com/posts/${postId}/votes`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ direction: "up" }),
    },
  );

  if (!res.ok) throw new Error(`Upvote failed: ${res.status}`);
  return res.json();
}

export async function removeVote(
  postId: number,
  voteId: number,
): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `https://bookface.ycombinator.com/posts/${postId}/votes/${voteId}`,
    {
      method: "DELETE",
      headers,
    },
  );

  if (!res.ok) throw new Error(`Remove vote failed: ${res.status}`);
}

// --- Demo Day Date ---

export async function getDemoDayDate(): Promise<Date> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    "https://bookface.ycombinator.com/chrome_extension/demo_day_date",
    {
      headers,
    },
  );

  if (!res.ok) throw new Error(`Demo day date error: ${res.status}`);
  const data: { demo_day_date: string } = await res.json();
  return new Date(data.demo_day_date);
}

// --- Agent / Messages ---

const AGENT_USER_ID = 3241775;

export interface ChatMessage {
  id: number;
  chat_id: number;
  content: string;
  created_at: string;
  type: "user" | "assistant";
  user: {
    id: number;
    full_name: string;
    avatar_thumb?: string;
  };
}

export interface Chat {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  initial_last_message?: {
    content: string;
    created_at: string;
    type: "user" | "assistant";
    user: { id: number; full_name: string };
  };
  initial_message_count: number;
  chat_users: { user: { id: number; full_name: string } }[];
}

export async function listAgentChats(): Promise<Chat[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    "https://bookface.ycombinator.com/messages.json?per_page=50",
    { headers },
  );
  if (!res.ok) throw new Error(`Messages error: ${res.status}`);
  const data: { chats: Chat[] } = await res.json();
  // Filter to agent chats only
  return data.chats.filter((c) =>
    c.chat_users.some((cu) => cu.user.id === AGENT_USER_ID),
  );
}

export async function getChatMessages(chatId: number): Promise<ChatMessage[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `https://bookface.ycombinator.com/messages/${chatId}/chat_messages`,
    {
      headers,
    },
  );
  if (!res.ok) throw new Error(`Chat messages error: ${res.status}`);
  const data: { messages: ChatMessage[] } = await res.json();
  return data.messages;
}

export async function sendAgentMessage(
  content: string,
  chatId?: number,
): Promise<{ chatId: number; messages: ChatMessage[] }> {
  const session = await authenticate();

  // Need CSRF token for POST - fetch it from a page
  const pageRes = await fetch("https://bookface.ycombinator.com/home", {
    headers: { Cookie: `_sso.key=${session.ssoKey}` },
    redirect: "follow",
  });
  const html = await pageRes.text();
  const csrfMatch = html.match(/name="csrf-token"\s+content="([^"]+)"/);
  const xsrfCookie = pageRes.headers
    .getSetCookie?.()
    ?.find((s) => s.startsWith("XSRF-TOKEN="))
    ?.split(";")[0]
    ?.split("=")
    .slice(1)
    .join("=");
  const csrfToken = csrfMatch?.[1] || xsrfCookie || "";

  const clientMessageId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // We need the XSRF-TOKEN cookie AND header to match for POST requests
  // Use the cookie from the page response
  const bfSessionCookie =
    pageRes.headers
      .getSetCookie?.()
      ?.find((s) => s.startsWith("_bf_session_key="))
      ?.split(";")[0] || "";

  const postCookie = `_sso.key=${session.ssoKey}; XSRF-TOKEN=${xsrfCookie}; ${bfSessionCookie}`;
  const postHeaders = {
    Cookie: postCookie,
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-CSRF-Token": csrfToken,
    "X-Requested-With": "XMLHttpRequest",
  };

  if (chatId) {
    // Send to existing chat
    const res = await fetch(
      `https://bookface.ycombinator.com/messages/${chatId}/chat_messages`,
      {
        method: "POST",
        headers: postHeaders,
        body: JSON.stringify({
          chat_message: {
            content,
            media_uploads: [],
            client_message_id: clientMessageId,
            version_number: 2,
          },
        }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Send message failed: ${res.status} - ${body.slice(0, 200)}`,
      );
    }
    return { chatId, messages: await getChatMessages(chatId) };
  } else {
    const res = await fetch("https://bookface.ycombinator.com/messages", {
      method: "POST",
      headers: postHeaders,
      body: JSON.stringify({
        chat: {
          user_ids: [AGENT_USER_ID],
          name: "",
          visibility: "private",
          message: {
            content,
            media_uploads: [],
            client_message_id: clientMessageId,
            version_number: 2,
            referrer: "/home",
          },
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(
        `Create chat failed: ${res.status} - ${body.slice(0, 200)}`,
      );
    }
    const chat = await res.json();
    return { chatId: chat.id, messages: chat.messages || [] };
  }
}

export async function pollForAgentReply(
  chatId: number,
  afterMessageId: number,
  timeoutMs = 60000,
): Promise<ChatMessage | null> {
  // Wait before first poll to give the agent time to start responding
  await new Promise((r) => setTimeout(r, 2000));

  const start = Date.now();
  let lastContent = "";
  let stableCount = 0;

  while (Date.now() - start < timeoutMs) {
    const messages = await getChatMessages(chatId);
    const reply = messages.find(
      (m) => m.id > afterMessageId && m.type === "assistant",
    );

    if (reply && reply.content) {
      if (reply.content === lastContent) {
        stableCount++;
        // Content hasn't changed for 2 consecutive polls - done streaming
        if (stableCount >= 2) {
          return reply;
        }
      } else {
        stableCount = 0;
        lastContent = reply.content;
      }
    }

    await new Promise((r) => setTimeout(r, 1500));
  }
  // Return whatever we have even if still streaming
  if (lastContent) {
    const messages = await getChatMessages(chatId);
    return (
      messages.find((m) => m.id > afterMessageId && m.type === "assistant") ??
      null
    );
  }
  return null;
}

