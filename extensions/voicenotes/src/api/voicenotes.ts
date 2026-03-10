import { getPreferenceValues } from "@raycast/api";

const BASE_URL = "https://api.voicenotes.com/api/integrations/obsidian-sync";


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

  body: JSON.stringify({
    last_synced_note_updated_at: null,
    obsidian_deleted_recording_ids: [],
  }),

export async function getUserInfo() {
  const response = await fetch(`${BASE_URL}/user/info`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.statusText}`);
  }

  return response.json();
}
