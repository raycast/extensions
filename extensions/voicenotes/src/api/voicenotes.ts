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

export async function getRecordings(): Promise<VoiceNote[]> {
  let url: string | undefined = `${BASE_URL}/recordings`;
  const all: VoiceNote[] = [];

  while (url) {
    const response = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        last_synced_note_updated_at: null,
        obsidian_deleted_recording_ids: [],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch recordings: ${response.statusText}`);
    }

    const json = (await response.json()) as RecordingsResponse;
    all.push(...json.data);
    url = json.links?.next;
  }

  return all;
}
