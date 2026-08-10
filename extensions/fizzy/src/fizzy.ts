import { getPreferenceValues } from "@raycast/api";
import { Account, Board, Card, CreateBoardRequest, ErrorResult, Notification, User } from "./types";

const { fizzy_url, api_token, account_slug } = getPreferenceValues<Preferences>();
export const ACCOUNT_SLUG = account_slug;

const makeRequest = async <T>(endpoint: string, options?: RequestInit) => {
  const url = new URL(endpoint, fizzy_url);
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...options?.headers,
      Authorization: `Bearer ${api_token}`,
    },
  });
  if ([201, 204].includes(response.status)) return undefined as T;
  if (response.headers.get("Content-Type")?.includes("text/plain")) throw new Error(await response.text());
  const result = await response.json();
  if (!response.ok) {
    const err = result as ErrorResult;
    if ("error" in err) throw new Error(err.error as string);
    throw new Error(`${Object.keys(err)[0]} - ${err[Object.keys(err)[0]]}`);
  }
  return result as T;
};

export const fizzy = {
  getMyIdentity: () => makeRequest<{ accounts: Account[] }>("my/identity"),
  boards: {
    create: (board: CreateBoardRequest) =>
      makeRequest(`${account_slug}/boards`, { method: "POST", body: JSON.stringify({ board }) }),
    delete: (boardId: string) => makeRequest(`${account_slug}/boards/${boardId}`, { method: "DELETE" }),
    list: () => makeRequest<Board[]>(`${account_slug}/boards`),
  },
  cards: {
    list: (boardId: string) => makeRequest<Card[]>(`${account_slug}/cards?board_ids[]=${boardId}`),
  },
  notifications: {
    list: () => makeRequest<Notification[]>(`${account_slug}/notifications`),
    markAsRead: (notificationId: string) =>
      makeRequest(`${account_slug}/notifications/${notificationId}/reading`, { method: "POST" }),
    markAllAsRead: () => makeRequest(`${account_slug}/notifications/bulk_reading`, { method: "POST" }),
    markAsUnread: (notificationId: string) =>
      makeRequest(`${account_slug}/notifications/${notificationId}/reading`, { method: "DELETE" }),
  },
  users: {
    deactivate: (userId: string) => makeRequest(`${account_slug}/users/${userId}`, { method: "DELETE" }),
    list: () => makeRequest<User[]>(`${account_slug}/users`),
    update: (userId: string, user: FormData) =>
      makeRequest(`${account_slug}/users/${userId}`, { method: "PUT", body: user }),
  },
};
