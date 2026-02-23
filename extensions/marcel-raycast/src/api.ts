import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Quest, QuestsResponse, QuestResponse } from "./types";

const DEFAULT_API_URL = "https://api.marcel.my";

function getApiUrl(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.apiUrl || DEFAULT_API_URL;
}

function getAuthHeaders(): HeadersInit {
  const preferences = getPreferenceValues<Preferences>();
  return {
    Authorization: `Bearer ${preferences.apiToken}`,
    "Content-Type": "application/json",
  };
}

export async function fetchQuests(): Promise<Quest[]> {
  try {
    const apiUrl = getApiUrl();
    const response = await fetch(`${apiUrl}/quest`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid API token. Please check your preferences.");
      }
      throw new Error(`Failed to fetch quests: ${response.statusText}`);
    }

    const data: QuestsResponse = await response.json();
    return data.quests;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch quests",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function completeQuest(questId: number): Promise<Quest> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/quest/${questId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ done: true }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid API token. Please check your preferences.");
    }
    if (response.status === 403) {
      throw new Error("You don't have permission to complete this quest.");
    }
    if (response.status === 404) {
      throw new Error("Quest not found.");
    }
    throw new Error(`Failed to complete quest: ${response.statusText}`);
  }

  const data: QuestResponse = await response.json();
  return data.quest;
}

export async function uncompleteQuest(questId: number): Promise<Quest> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/quest/${questId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ done: false }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid API token. Please check your preferences.");
    }
    if (response.status === 403) {
      throw new Error("You don't have permission to modify this quest.");
    }
    if (response.status === 404) {
      throw new Error("Quest not found.");
    }
    throw new Error(`Failed to uncomplete quest: ${response.statusText}`);
  }

  const data: QuestResponse = await response.json();
  return data.quest;
}

export async function updateQuestStatus(questId: number, status: "todo" | "doing" | "done"): Promise<Quest> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/quest/${questId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid API token. Please check your preferences.");
    }
    if (response.status === 403) {
      throw new Error("You don't have permission to modify this quest.");
    }
    if (response.status === 404) {
      throw new Error("Quest not found.");
    }
    throw new Error(`Failed to update quest: ${response.statusText}`);
  }

  const data: QuestResponse = await response.json();
  return data.quest;
}

export async function deleteQuest(questId: number): Promise<void> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/quest/${questId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid API token. Please check your preferences.");
    }
    if (response.status === 403) {
      throw new Error("You don't have permission to delete this quest.");
    }
    if (response.status === 404) {
      throw new Error("Quest not found.");
    }
    throw new Error(`Failed to delete quest: ${response.statusText}`);
  }
}

export interface CreateQuestPayload {
  title: string;
  note?: string;
  difficulty?: "easy" | "medium" | "hard" | "epic" | "legendary";
  status?: "todo" | "doing" | "done";
  date?: string;
  time?: string;
  spaceId?: number;
  journeyId?: number;
}

export async function createQuest(payload: CreateQuestPayload): Promise<Quest> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/quest`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid API token. Please check your preferences.");
    }
    if (response.status === 403) {
      throw new Error("You don't have permission to create quests.");
    }
    if (response.status === 400) {
      throw new Error("Invalid quest data. Please check your input.");
    }
    throw new Error(`Failed to create quest: ${response.statusText}`);
  }

  const data: QuestResponse = await response.json();
  return data.quest;
}
