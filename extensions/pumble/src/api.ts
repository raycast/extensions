import { getPreferenceValues, showToast, Toast } from "@raycast/api";

const BASE_URL = "https://pumble-api-keys.addons.marketplace.cake.com";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status?: string;
  role?: string;
}

export interface Channel {
  channel: {
    id: string;
    name: string;
    channelType: "PUBLIC" | "PRIVATE";
    description?: string;
    workspaceId: string;
    isMember: boolean;
    isMuted: boolean;
    isHidden: boolean;
    isArchived: boolean;
    isMain: boolean;
    isInitial: boolean;
    // Add other properties as needed
  };
  users: string[];
}

export interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: string;
  reactions?: Record<string, string[]>;
}

/**
 * Fetches all users from the Pumble workspace
 */
export async function fetchUsers(): Promise<User[]> {
  return apiRequest<User[]>("/listUsers", "GET");
}

/**
 * Fetches all channels from the Pumble workspace
 */
export async function fetchChannels(): Promise<Channel[]> {
  return apiRequest<Channel[]>("/listChannels", "GET");
}

/**
 * Fetches messages from a specific channel
 */
export async function fetchMessages(channel: string): Promise<Message[]> {
  return apiRequest<Message[]>(`/listMessages?channel=${encodeURIComponent(channel)}`, "GET");
}

/**
 * Sends a message to a channel
 */
export async function sendMessage(text: string, channel: string, asBot = true): Promise<void> {
  await apiRequest("/sendMessage", "POST", { text, channel, asBot });
}

/**
 * Replies to a message
 */
export async function sendReply(channel: string, messageId: string, text: string): Promise<void> {
  await apiRequest("/sendReply", "POST", { channel, messageId, text });
}

/**
 * Adds a reaction to a message
 */
export async function addReaction(messageId: string, reaction: string): Promise<void> {
  await apiRequest("/addReaction", "POST", { messageId, reaction });
}

/**
 * Creates a new channel
 */
export async function createChannel(name: string, type: "PUBLIC" | "PRIVATE", description = ""): Promise<void> {
  await apiRequest("/createChannel", "POST", { name, type, description });
}

/**
 * Deletes a message
 */
export async function deleteMessage(messageId: string, channel: string): Promise<void> {
  await apiRequest(
    `/deleteMessage?messageId=${encodeURIComponent(messageId)}&channel=${encodeURIComponent(channel)}`,
    "DELETE",
  );
}

/**
 * Generic API request function
 */
async function apiRequest<T>(endpoint: string, method: string, body?: Record<string, unknown>): Promise<T> {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.apiKey) {
    throw new Error("API Key not found. Please set it in the extension preferences.");
  }

  const options: RequestInit = {
    method,
    headers: {
      "Api-Key": preferences.apiKey,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
  };

  if (body && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Error ${response.status}: ${errorText}`);
    }

    // For DELETE requests or other requests that might not return JSON
    if (method === "DELETE" || response.headers.get("content-length") === "0") {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    await showToast({
      style: Toast.Style.Failure,
      title: "API Request Failed",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
