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

interface Preferences {
  token: string;
}

const getHeaders = () => {
  const { token } = getPreferenceValues<Preferences>();
  return {
    Authorization: `Bearer ${token}`,
    "X-API-KEY": token,
    "Content-Type": "application/json",
  };
};
export async function getRecordings(
  signal?: AbortSignal,
): Promise<VoiceNote[]> {
  const response = await fetch(`${BASE_URL}/recordings`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      last_synced_note_updated_at: null,
      obsidian_deleted_recording_ids: [],
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Failed to fetch recordings: ${response.status} ${response.statusText} - ${text}`,
    );
  }

  const data: RecordingsResponse = await response.json();
  return data.data || [];
}

// Note: `getUserInfo` was removed because it was not used anywhere in the extension.
