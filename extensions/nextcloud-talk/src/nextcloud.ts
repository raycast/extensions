import { Buffer } from "node:buffer";

export type Preferences = Preferences.SendMessage;

export type Conversation = {
  id: number;
  token: string;
  type: number;
  name: string;
  displayName: string;
  description?: string;
  lastActivity: number;
  isFavorite: boolean;
  unreadMessages?: number;
  readOnly?: number;
};

type OcsMeta = {
  status?: string;
  statuscode?: number;
  message?: string;
};

type OcsResponse<T> = {
  ocs?: {
    meta?: OcsMeta;
    data?: T;
  };
};

export class NextcloudError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "NextcloudError";
  }
}

export function normalizeInstanceUrl(value: string): string {
  const withProtocol = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new NextcloudError("The Nextcloud instance URL is invalid.");
  }

  if (!url.hostname || !["http:", "https:"].includes(url.protocol)) {
    throw new NextcloudError("The Nextcloud instance URL must use HTTP or HTTPS.");
  }

  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function headers(preferences: Preferences): Record<string, string> {
  const credentials = Buffer.from(`${preferences.username}:${preferences.appPassword}`, "utf8").toString("base64");
  return {
    Accept: "application/json",
    Authorization: `Basic ${credentials}`,
    "OCS-APIRequest": "true",
  };
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => undefined)) as OcsResponse<T> | undefined;
  const meta = body?.ocs?.meta;
  const message = meta?.message?.trim();

  if (!response.ok || meta?.status === "failure" || body?.ocs?.data === undefined) {
    if (response.status === 401) {
      throw new NextcloudError("Authentication failed. Check your username and app password.", response.status);
    }
    if (response.status === 404) {
      throw new NextcloudError("Nextcloud Talk is unavailable, or the conversation no longer exists.", response.status);
    }
    if (response.status === 403) {
      throw new NextcloudError(message || "You do not have permission to perform this action.", response.status);
    }

    throw new NextcloudError(message || `Nextcloud returned HTTP ${response.status}.`, response.status);
  }

  return body.ocs.data;
}

export async function getConversations(preferences: Preferences, signal?: AbortSignal): Promise<Conversation[]> {
  const instanceUrl = normalizeInstanceUrl(preferences.instanceUrl);
  const url = `${instanceUrl}/ocs/v2.php/apps/spreed/api/v4/room?includeStatus=true`;
  const response = await fetch(url, { headers: headers(preferences), signal });
  const conversations = await parseResponse<Conversation[]>(response);

  return conversations
    .filter((conversation) => conversation.token && conversation.displayName)
    .sort((first, second) => {
      if (first.isFavorite !== second.isFavorite) return first.isFavorite ? -1 : 1;
      return second.lastActivity - first.lastActivity;
    });
}

export async function sendMessage(preferences: Preferences, token: string, message: string): Promise<void> {
  const instanceUrl = normalizeInstanceUrl(preferences.instanceUrl);
  const url = `${instanceUrl}/ocs/v2.php/apps/spreed/api/v1/chat/${encodeURIComponent(token)}`;
  const body = new URLSearchParams({ message });
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...headers(preferences),
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body,
  });

  await parseResponse<unknown>(response);
}
