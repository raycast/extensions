import { getPreferenceValues } from "@raycast/api";
import axios from "axios";
import {
  ThoughtInput,
  AIClassification,
  CreateThoughtRequest,
  NotionThought,
  DraftResponse,
  CreateResponse,
  PrioritiesResponse,
  Category,
} from "./types";

interface Preferences {
  serverUrl: string;
}

function getServerUrl(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.serverUrl || "http://localhost:3000";
}

export async function draftThought(
  input: ThoughtInput,
): Promise<AIClassification> {
  try {
    const response = await axios.post<DraftResponse>(
      `${getServerUrl()}/draft`,
      {
        text: input.text,
        context: input.context,
      },
    );

    return response.data.classification;
  } catch (error) {
    console.error("Error drafting thought:", error);
    throw new Error("Failed to classify thought with AI");
  }
}

export async function createThought(
  thought: CreateThoughtRequest,
): Promise<string> {
  try {
    const response = await axios.post<CreateResponse>(
      `${getServerUrl()}/create`,
      thought,
    );

    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to create thought");
    }

    return response.data.id || "";
  } catch (error) {
    console.error("Error creating thought:", error);
    throw new Error("Failed to save thought to Notion");
  }
}

export async function getPriorities(
  category?: Category,
): Promise<NotionThought[]> {
  try {
    const url = category
      ? `${getServerUrl()}/priorities?category=${category.toLowerCase()}`
      : `${getServerUrl()}/priorities`;

    const response = await axios.get<PrioritiesResponse>(url);
    return response.data.thoughts;
  } catch (error) {
    console.error("Error fetching priorities:", error);
    throw new Error("Failed to fetch priorities from Notion");
  }
}

export async function getWorkPriorities(): Promise<NotionThought[]> {
  return getPriorities("Work");
}

export async function getLifePriorities(): Promise<NotionThought[]> {
  return getPriorities("Personal");
}

export async function getAllPriorities(): Promise<NotionThought[]> {
  return getPriorities();
}
