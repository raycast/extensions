import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

const BASE_URL = "https://api.voicenotes.com/api/integrations/obsidian-sync";

interface Preferences {
  token: string;
}

export interface VoiceNote {
  id: string;
  recording_id: string;
  title: string;
  duration: number;
  transcript: string;
  created_at: string;
  updated_at: string;
  tags: { name: string }[];
  summary?: string;
}

interface RecordingsResponse {
  data: VoiceNote[];
  links: {
    next?: string;
  };
}

const getHeaders = () => {
  const { token } = getPreferenceValues<Preferences>();
  return {
    Authorization: `Bearer ${token}`,
    "X-API-KEY": token,
    "Content-Type": "application/json",
  };
};

export async function getRecordings(): Promise<VoiceNote[]> {
  const response = await fetch(`${BASE_URL}/recordings`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      last_synced_note_updated_at: undefined,
      obsidian_deleted_recording_ids: [],
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch recordings: ${response.statusText}`);
  }

  const json = (await response.json()) as RecordingsResponse;
  return json.data;
}

export async function getUserInfo() {
  const response = await fetch(`${BASE_URL}/user/info`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.statusText}`);
  }

  return response.json();
}
