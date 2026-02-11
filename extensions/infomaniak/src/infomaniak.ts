import { getPreferenceValues } from "@raycast/api";
import {
  Account,
  AccountDrive,
  AccountInvitation,
  ActivityFileV3,
  Comment,
  CursorResult,
  ErrorResult,
  InviteUser,
  PaginatedResult,
  ResultV3,
  SingleResult,
  Team,
  User,
} from "./types";

const { api_token, account_id } = getPreferenceValues<Preferences>();
const API_URL = "https://api.infomaniak.com";
const API_HEADERS = {
  Authorization: `Bearer ${api_token}`,
  Accept: "application/json",
  "Content-Type": "application/json",
};
export const TINT_COLOR = "#5c89f7";
const makeRequest = async <T>(endpoint: string, options?: { method: string; body?: Record<string, string> }) => {
  const url = new URL(endpoint, API_URL);
  const response = await fetch(url, {
    method: options?.method,
    headers: API_HEADERS,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) {
    const err = result as ErrorResult;
    throw new Error(err.error.errors?.[0].description || err.error.description);
  }
  return result as T;
};

export const infomaniak = {
  accounts: {
    list: () => makeRequest<SingleResult<Account[]>>("1/accounts"),
    users: {
      invite: (params: { accountId: number; body: InviteUser }) =>
        makeRequest<SingleResult<AccountInvitation>>(`1/accounts/${params.accountId}/invitations`, {
          method: "POST",
          body: params.body,
        }),
      list: (params: { accountId: number; page: number }) =>
        makeRequest<PaginatedResult<User>>(`2/accounts/${params.accountId}/users?page=${params.page}`),
    },
    teams: {
      list: (params: { accountId: number; page: number }) =>
        makeRequest<PaginatedResult<Team>>(`1/accounts/${params.accountId}/teams?page=${params.page}`),
    },
  },
  drives: {
    files: {
      favorites: {
        list: (params: { driveId: number; cursor?: string }) =>
          makeRequest<CursorResult<ResultV3>>(
            `3/drive/${params.driveId}/files/favorites?with=is_favorite${params.cursor ? `&cursor=${params.cursor}` : ""}`,
          ),
      },
      getActivities: (params: { driveId: number; fileId: number; cursor?: string }) =>
        makeRequest<CursorResult<ActivityFileV3>>(
          `3/drive/${params.driveId}/files/${params.fileId}/activities${params.cursor ? `?cursor=${params.cursor}` : ""}`,
        ),
      getComments: (params: { driveId: number; fileId: number; page: number }) =>
        makeRequest<PaginatedResult<Comment>>(
          `2/drive/${params.driveId}/files/${params.fileId}/comments?page=${params.page}`,
        ),
    },
    list: (params: { page: number }) =>
      makeRequest<PaginatedResult<AccountDrive>>(`2/drive?account_id=${account_id}&page=${params.page}`),
    search: (params: { driveId: number; query: string; cursor?: string }) =>
      makeRequest<CursorResult<ResultV3>>(
        `3/drive/${params.driveId}/files/search?with=is_favorite&query=${params.query}${params.cursor ? `&cursor=${params.cursor}` : ""}`,
      ),
  },
};
