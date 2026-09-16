// One place for every call to Asyntai. Every command imports this file.
//
// The extension talks to the public API (/api/v1/) with the account owner's
// API key. Raycast keeps the key in the command preferences and it only leaves
// the machine in the Authorization header of a call to asyntai.com.

import { getPreferenceValues } from "@raycast/api";

export const BASE = "https://asyntai.com";

// Questions asked with "Ask My Chatbot" go through the same API as a visitor
// chat, so Asyntai stores them as sessions. They are the owner's own
// questions, not visitor chats, so Recent Chats leaves them out. Every one
// carries this marker in its session id. The browser extension uses the
// ext_ask_ marker for the same reason, so both are filtered.
export const ASK_MARKER = "raycast_ask_";
const OTHER_MARKERS = ["ext_ask_"];

export function newAskSession(): string {
  return `${ASK_MARKER}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isOwnQuestion(sessionId: string | null | undefined): boolean {
  if (typeof sessionId !== "string") return false;
  return [ASK_MARKER, ...OTHER_MARKERS].some((marker) => sessionId.startsWith(marker));
}

// `Preferences` comes from raycast-env.d.ts, generated from package.json.
export function apiKey(): string {
  return (getPreferenceValues<Preferences>().apiKey || "").trim();
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export interface Session {
  session_id: string;
  source?: string;
  message_count?: number;
  first_message?: string | null;
  first_message_at?: string | null;
  last_message_at?: string | null;
  page_url?: string | null;
  country?: string | null;
  website_domain?: string | null;
  category?: string;
}

export interface Lead {
  session_id: string;
  email?: string | null;
  phone?: string | null;
  page_url?: string | null;
  started_at?: string | null;
}

export interface Ticket {
  ticket_number?: string;
  session_id?: string | null;
  status?: string;
  priority?: string;
  subject?: string;
  visitor_email?: string | null;
  page_url?: string | null;
  channel?: string;
  assigned_to?: string | null;
  created_at?: string | null;
  resolved_at?: string | null;
}

export interface Message {
  role: string;
  content: string;
  timestamp?: string;
}

export function headers(): Record<string, string> {
  return { Authorization: `Bearer ${apiKey()}` };
}

// Turns an API answer into a clear error, or hands the JSON back. useFetch
// calls it with the raw Response.
export async function parseResponse<T>(response: Response): Promise<T> {
  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }
  const error = typeof data.error === "string" ? data.error : "";
  if (response.status === 401) {
    throw new ApiError("Asyntai no longer accepts this key. Open the command preferences and paste a new key.", 401);
  }
  if (response.status === 403) {
    throw new ApiError(error || "The Asyntai API needs the Starter plan or higher.", 403);
  }
  if (!response.ok || data.success === false) {
    throw new ApiError(error || `Asyntai answered with status ${response.status}.`, response.status);
  }
  return data as T;
}

export function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([name, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(name, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}

export async function request<T>(path: string, body?: Record<string, unknown>): Promise<T> {
  const init: RequestInit = { method: body ? "POST" : "GET", headers: headers() };
  if (body) {
    init.headers = { ...headers(), "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  let response: Response;
  try {
    response = await fetch(BASE + path, init);
  } catch {
    throw new ApiError("Asyntai did not answer. Check your connection.", 0);
  }
  return parseResponse<T>(response);
}

export const api = {
  chat: (message: string, sessionId: string) =>
    request<{ response: string; session_id: string }>("/api/v1/chat/", { message, session_id: sessionId }),
};

// "3 min ago", "2 h ago", "4 d ago". Short, because a list row has little room.
export function ago(iso: string | null | undefined): string {
  if (!iso) return "";
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.floor(minutes)} min ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.floor(hours)} h ago`;
  const days = hours / 24;
  if (days < 30) return `${Math.floor(days)} d ago`;
  return new Date(iso).toLocaleDateString();
}

// Chat text goes into Detail markdown. A visitor could type an image link,
// and Raycast would fetch it when the owner reads the chat. So every "![" and
// every "<" is escaped: the text still reads the same, but nothing loads.
export function safeMarkdown(text: string): string {
  return text.replace(/!\[/g, "\\![").replace(/</g, "\\<");
}

export function dashboardUrl(sessionId: string): string {
  return `${BASE}/chat/${encodeURIComponent(sessionId)}/`;
}
